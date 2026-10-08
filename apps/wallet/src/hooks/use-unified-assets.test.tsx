import { Bip39Wallet } from "@sango/wallet-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WalletSession } from "@sango/wallet-session";

// Mock du builder pour injecter des sessions contrôlées par wallet.
const mockSessions = new Map<unknown, WalletSession>();

vi.mock("@/lib/build-wallet-session", () => ({
  buildWalletSession: vi.fn((wallet: unknown) => {
    const s = mockSessions.get(wallet);
    return (
      s ??
      ({
        getBalance: async () => ({ amount: 0n }),
        listTokens: async () => [],
        getTokenBalance: async () => 0n,
      } as unknown as WalletSession)
    );
  }),
}));

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

import { useUnifiedAssets } from "./use-unified-assets";

afterEach(cleanup);

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";

let wallet1: Bip39Wallet;
let wallet2: Bip39Wallet;
let wallet3: Bip39Wallet;

function makeSession(overrides: {
  getBalance?: (account: unknown, ref: unknown) => Promise<{ amount: bigint }>;
  listTokens?: () => Promise<unknown[]>;
  getTokenBalance?: (account: unknown, token: unknown) => Promise<bigint>;
}): WalletSession {
  return {
    getBalance:
      overrides.getBalance ?? (async () => ({ amount: 0n })),
    listTokens: overrides.listTokens ?? (async () => []),
    getTokenBalance: overrides.getTokenBalance ?? (async () => 0n),
  } as unknown as WalletSession;
}

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(async () => {
  mockSessions.clear();
  if (!wallet1) {
    wallet1 = await Bip39Wallet.fromMnemonic(MNEMONIC);
    wallet2 = await Bip39Wallet.fromMnemonic(MNEMONIC);
    wallet3 = await Bip39Wallet.fromMnemonic(MNEMONIC);
  }
  localStorage.clear();
  useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
  useWalletStore.setState({
    wallets: {},
    wallet: null,
    format: null,
    networkId: "sango-devnet",
    family: "sango",
    network: "testnet",
    status: "no-wallet",
    activeId: null,
    walletAccounts: {},
    walletNetworks: {},
  });
});

function seedWallets(
  entries: Array<{
    id: string;
    wallet: Bip39Wallet;
    networkId: string;
    label: string;
    createdAt: number;
  }>,
  activeId: string,
) {
  const wallets: Record<string, unknown> = {};
  for (const e of entries) {
    wallets[e.id] = {
      wallet: e.wallet,
      format: "bip39",
      networkId: e.networkId,
      label: e.label,
      createdAt: e.createdAt,
    };
  }
  useWalletStore.setState({
    wallets: wallets as never,
    activeId,
    status: "unlocked",
    format: "bip39",
    networkId:
      entries.find((e) => e.id === activeId)?.networkId ?? "ethereum-sepolia",
    family: "evm",
    network: "testnet",
  });
}

describe("useUnifiedAssets — Phase 4", () => {
  it("retourne [] si < 2 wallets déverrouillés", () => {
    useWalletStore.setState({ status: "no-wallet" });
    const { result } = renderHook(() => useUnifiedAssets(), {
      wrapper: Wrapper,
    });
    expect(result.current.assets).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("exclut le wallet actif (D6·A)", async () => {
    seedWallets(
      [
        { id: "w1", wallet: wallet1, networkId: "sango-devnet", label: "W1", createdAt: 1 },
        { id: "w2", wallet: wallet2, networkId: "ethereum-sepolia", label: "W2", createdAt: 2 },
      ],
      "w1",
    );
    mockSessions.set(wallet2, makeSession({
      getBalance: async () => ({ amount: 123n }),
    }));

    const { result } = renderHook(() => useUnifiedAssets(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets).toHaveLength(1);
    expect(result.current.assets[0]!.walletId).toBe("w2");
    expect(result.current.assets[0]!.symbol).toBe("ETH");
    expect(result.current.assets[0]!.balance).toBe(123n);
  });

  it("agrège natif + tokens EVM", async () => {
    seedWallets(
      [
        { id: "w1", wallet: wallet1, networkId: "sango-devnet", label: "W1", createdAt: 1 },
        { id: "w2", wallet: wallet2, networkId: "ethereum-sepolia", label: "W2", createdAt: 2 },
      ],
      "w1",
    );
    mockSessions.set(wallet2, makeSession({
      getBalance: async () => ({ amount: 500n }),
      listTokens: async () => [
        {
          networkId: "ethereum-sepolia",
          contract: "0x" + "aa".repeat(20),
          assetId: "usdc",
          metadata: { name: "USD Coin", symbol: "USDC", decimals: 6 },
        },
      ],
      getTokenBalance: async () => 1_000_000n,
    }));

    const { result } = renderHook(() => useUnifiedAssets(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets.map((a) => a.symbol)).toEqual([
      "ETH",
      "USDC",
    ]);
  });

  it("tri fixe D5·B : ETH, BTC, USDC, USDT, BNB", async () => {
    seedWallets(
      [
        { id: "w1", wallet: wallet1, networkId: "sango-devnet", label: "W1", createdAt: 1 },
        { id: "w2", wallet: wallet2, networkId: "ethereum-sepolia", label: "W2", createdAt: 2 },
        { id: "w3", wallet: wallet3, networkId: "bitcoin-testnet", label: "W3", createdAt: 3 },
      ],
      "w1",
    );
    // w2 = EVM : ETH + USDC
    mockSessions.set(wallet2, makeSession({
      getBalance: async () => ({ amount: 100n }),
      listTokens: async () => [
        {
          networkId: "ethereum-sepolia",
          contract: "0x" + "aa".repeat(20),
          assetId: "usdc",
          metadata: { name: "USD Coin", symbol: "USDC", decimals: 6 },
        },
      ],
      getTokenBalance: async () => 100n,
    }));
    // w3 = BTC
    mockSessions.set(wallet3, makeSession({
      getBalance: async () => ({ amount: 5000n }),
    }));

    const { result } = renderHook(() => useUnifiedAssets(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets.map((a) => a.symbol)).toEqual([
      "ETH",
      "BTC",
      "USDC",
    ]);
  });

  it("balance null si fetch échoue (pas de crash)", async () => {
    seedWallets(
      [
        { id: "w1", wallet: wallet1, networkId: "sango-devnet", label: "W1", createdAt: 1 },
        { id: "w2", wallet: wallet2, networkId: "ethereum-sepolia", label: "W2", createdAt: 2 },
      ],
      "w1",
    );
    mockSessions.set(wallet2, makeSession({
      getBalance: async () => {
        throw new Error("RPC down");
      },
    }));

    const { result } = renderHook(() => useUnifiedAssets(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets[0]!.balance).toBeNull();
  });
});
