import { asAddress } from "@sango/wallet-chains";
import type { Token } from "@sango/wallet-chains";
import type { WalletSession } from "@sango/wallet-session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useApproveEvm } from "./use-approve-evm";

/**
 * 🔒 useApproveEvm — E2.2.a.2
 *
 * Vérifie le mapping hook → SendParams.approveErc20 :
 *   - networkId et contract tirés du Token fourni
 *   - amountBaseUnits passé tel quel (pas de parsing)
 *   - le hook ne connaît pas MAX_UINT256 (c'est l'UI)
 *
 * ⚠️ cleanup explicite (le projet n'a pas la cleanup auto activée).
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
});

const SPENDER = asAddress("dd".repeat(20));
const TOKEN_CONTRACT = "0x" + "aa".repeat(20);
const TX_HASH = "0x" + "00".repeat(32);

const USDT_BSC: Token = {
  networkId: "bsc",
  contract: TOKEN_CONTRACT,
  assetId: "usdt",
  metadata: {
    name: "Binance-Peg BSC-USD",
    symbol: "USDT",
    decimals: 18,
  },
};

const USDC_ETH: Token = {
  networkId: "ethereum-mainnet",
  contract: TOKEN_CONTRACT,
  assetId: "usdc",
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
};

function makeWrapper(session: WalletSession | null, qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <WalletSessionContext.Provider value={session}>
          {children}
        </WalletSessionContext.Provider>
      </QueryClientProvider>
    );
  };
}

function makeQc() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 60_000 },
      mutations: { retry: false },
    },
  });
}

function makeSession() {
  type SendFn = (
    params: {
      kind: string;
      token: string;
      spender: string;
      amount: bigint;
      assetRef: { kind: string; networkId: string; contract: string };
    },
    account: unknown,
  ) => Promise<string>;
  const send = vi.fn<SendFn>(async () => TX_HASH);
  return {
    session: { send } as unknown as WalletSession,
    send,
  };
}

describe("useApproveEvm — mapping SendParams", () => {
  it("Ethereum Mainnet + USDC → assetRef/contract/spender/amount", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-mainnet",
    family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useApproveEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({
      token: USDC_ETH,
      spender: SPENDER,
      amountBaseUnits: 1_000_000n,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(send).toHaveBeenCalledTimes(1);
    const [params] = send.mock.calls[0]!;
    expect(params.kind).toBe("approveErc20");
    expect(params.token).toBe(TOKEN_CONTRACT);
    expect(params.spender).toBe(SPENDER);
    expect(params.amount).toBe(1_000_000n);
    expect(params.assetRef).toEqual({
      kind: "token",
      networkId: "ethereum-mainnet",
      contract: TOKEN_CONTRACT,
    });
  });

  it("BSC Mainnet + USDT 18 dec → amount passé tel quel", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useApproveEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    // 1 USDT BSC = 1e18 base units. Le hook ne touche pas au montant.
    result.current.mutate({
      token: USDT_BSC,
      spender: SPENDER,
      amountBaseUnits: 10n ** 18n,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [params] = send.mock.calls[0]!;
    expect(params.amount).toBe(10n ** 18n);
    expect(params.assetRef.networkId).toBe("bsc");
  });

  it("MAX_UINT256 passé tel quel (unlimited)", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();
    const max = (1n << 256n) - 1n;

    const { result } = renderHook(() => useApproveEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({
      token: USDT_BSC,
      spender: SPENDER,
      amountBaseUnits: max,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send.mock.calls[0]![0].amount).toBe(max);
  });

  it("rejette un token dont le networkId ≠ networkId courant", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-mainnet",
    family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useApproveEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({
      token: USDT_BSC, // BSC token mais réseau courant = ethereum-mainnet
      spender: SPENDER,
      amountBaseUnits: 1n,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/token network/);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejette un wallet SANGO (format ≠ bip39)", async () => {
    useWalletStore.setState({
      format: "sango-legacy",
      status: "unlocked",
      networkId: "sango-devnet",
    family: "sango",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useApproveEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({
      token: USDC_ETH,
      spender: SPENDER,
      amountBaseUnits: 1n,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/wallets BIP-39/);
    expect(send).not.toHaveBeenCalled();
  });

  it("erreur si WalletSession indisponible", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-mainnet",
    family: "evm",
    });
    const qc = makeQc();

    const { result } = renderHook(() => useApproveEvm(), {
      wrapper: makeWrapper(null, qc),
    });
    result.current.mutate({
      token: USDC_ETH,
      spender: SPENDER,
      amountBaseUnits: 1n,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/WalletSession/);
  });
});
