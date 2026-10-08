import { Bip39Wallet } from "@sango/wallet-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WalletSession } from "@sango/wallet-session";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockSessions = new Map<unknown, WalletSession>();
vi.mock("@/lib/build-wallet-session", () => ({
  buildWalletSession: vi.fn((wallet: unknown) => {
    const s = mockSessions.get(wallet);
    // Session no-op par défaut : évite les throws quand un wallet
    // devient non-actif après un switch (ex. clic sur une ligne).
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

import { OtherAssetsList } from "./other-assets-list";

afterEach(cleanup);

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";

let wallet1: Bip39Wallet;
let wallet2: Bip39Wallet;

function makeSession(balance = 100n): WalletSession {
  return {
    getBalance: async () => ({ amount: balance }),
    listTokens: async () => [],
    getTokenBalance: async () => 0n,
  } as unknown as WalletSession;
}

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(async () => {
  mockSessions.clear();
  if (!wallet1) {
    wallet1 = await Bip39Wallet.fromMnemonic(MNEMONIC);
    wallet2 = await Bip39Wallet.fromMnemonic(MNEMONIC);
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

function seedTwo(activeId = "w1") {
  useWalletStore.setState({
    wallets: {
      w1: {
        wallet: wallet1,
        format: "bip39",
        networkId: "sango-devnet",
        label: "W1",
        createdAt: 1,
      },
      w2: {
        wallet: wallet2,
        format: "bip39",
        networkId: "ethereum-sepolia",
        label: "W2",
        createdAt: 2,
      },
    } as never,
    activeId,
    status: "unlocked",
    format: "bip39",
    networkId: "sango-devnet",
    family: "sango",
    network: "testnet",
  });
}

describe("OtherAssetsList — Phase 4", () => {
  it("null si 1 seul wallet (D7·A)", () => {
    useWalletStore.setState({
      wallets: {
        w1: {
          wallet: wallet1,
          format: "bip39",
          networkId: "sango-devnet",
          label: "W1",
          createdAt: 1,
        },
      } as never,
      activeId: "w1",
      status: "unlocked",
      format: "bip39",
    });
    const { container } = render(<OtherAssetsList />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("affiche la section si ≥ 2 wallets", async () => {
    seedTwo();
    mockSessions.set(wallet2, makeSession(42n));
    render(<OtherAssetsList />, { wrapper: Wrapper });
    expect(screen.getByText("Autres cryptos")).toBeTruthy();
    expect(screen.getByTestId("other-assets-manage")).toBeTruthy();
  });

  it("clic sur une ligne → switchWallet (D4·A)", async () => {
    seedTwo();
    mockSessions.set(wallet2, makeSession(42n));
    render(<OtherAssetsList />, { wrapper: Wrapper });

    // Attendre l'apparition de la ligne ETH (walletId=w2)
    const row = await screen.findByTestId(/^asset-row-w2:/);
    fireEvent.click(row);

    expect(useWalletStore.getState().activeId).toBe("w2");
  });

  it("Gérer ouvre la modale (D8·A)", () => {
    seedTwo();
    mockSessions.set(wallet2, makeSession());
    render(<OtherAssetsList />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId("other-assets-manage"));
    expect(screen.getByTestId("wallets-and-accounts-modal")).toBeTruthy();
  });
});
