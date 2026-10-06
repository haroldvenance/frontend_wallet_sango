import { asAddress } from "@sango/wallet-chains";
import type { Token } from "@sango/wallet-chains";
import type { WalletSession } from "@sango/wallet-session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useEvmAllowance } from "./use-evm-allowance";

/**
 * 🔒 useEvmAllowance — E2.2.a.3
 *
 * Vérifie :
 *   - délégation à session.getAllowance(account, spender, token)
 *   - enabled seulement si (bip39 + session + token + spender valide)
 *   - clé de cache ["allowance", endpoint, networkId, contract, spender]
 *   - propagation d'erreur
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

const USDT_BSC: Token = {
  networkId: "bsc",
  contract: TOKEN_CONTRACT,
  assetId: "usdt",
  metadata: { name: "Binance-Peg BSC-USD", symbol: "USDT", decimals: 18 },
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
    defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
  });
}

function makeSession(amount: bigint = 1_000_000n) {
  const getAllowance = vi.fn(async () => amount);
  return {
    session: { getAllowance } as unknown as WalletSession,
    getAllowance,
  };
}

describe("useEvmAllowance — lecture", () => {
  it("délègue à session.getAllowance(account, spender, token)", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    });
    const { session, getAllowance } = makeSession(5_000n);
    const qc = makeQc();

    const { result } = renderHook(
      () => useEvmAllowance(USDT_BSC, SPENDER),
      { wrapper: makeWrapper(session, qc) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAllowance).toHaveBeenCalledWith(
      expect.objectContaining({ family: "evm", networkId: "bsc" }),
      SPENDER,
      USDT_BSC,
    );
    expect(result.current.data?.amount).toBe(5_000n);
    expect(result.current.data?.spender).toBe(SPENDER);
  });

  it("retourne null quand token est null (query désactivée)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    });
    const { session, getAllowance } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(
      () => useEvmAllowance(null, SPENDER),
      { wrapper: makeWrapper(session, qc) },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getAllowance).not.toHaveBeenCalled();
  });

  it("query désactivée si spender invalide (format)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    });
    const { session, getAllowance } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(
      () => useEvmAllowance(USDT_BSC, "0x12" as `0x${string}`),
      { wrapper: makeWrapper(session, qc) },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getAllowance).not.toHaveBeenCalled();
  });

  it("query désactivée si session null", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    });
    const qc = makeQc();

    const { result } = renderHook(
      () => useEvmAllowance(USDT_BSC, SPENDER),
      { wrapper: makeWrapper(null, qc) },
    );

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("query désactivée si format ≠ bip39", () => {
    useWalletStore.setState({
      format: "sango-legacy",
      status: "unlocked",
      networkId: "sango-devnet",
    });
    const { session, getAllowance } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(
      () => useEvmAllowance(USDT_BSC, SPENDER),
      { wrapper: makeWrapper(session, qc) },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getAllowance).not.toHaveBeenCalled();
  });
});

describe("useEvmAllowance — clé de cache", () => {
  it("utilise [allowance, endpoint, networkId, contract, spender]", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    });
    const { session } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(
      () => useEvmAllowance(USDT_BSC, SPENDER),
      { wrapper: makeWrapper(session, qc) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    // L'endpoint vient de `useNetworkQueryContext` (D-E1.7-10) : pour
    // un réseau EVM, il résout `Network.defaultRpcEndpoints[0]` — pas
    // l'endpoint SANGO du sdk-store.
    expect(keys).toContainEqual([
      "allowance",
      "https://bsc-dataseed.binance.org",
      "bsc",
      TOKEN_CONTRACT,
      SPENDER,
    ]);
  });
});

describe("useEvmAllowance — erreurs", () => {
  it("propage une erreur getAllowance", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    });
    const session = {
      getAllowance: vi.fn(async () => {
        throw new Error("execution reverted");
      }),
    } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(
      () => useEvmAllowance(USDT_BSC, SPENDER),
      { wrapper: makeWrapper(session, qc) },
    );

    // `retry: 1` dans le hook → React Query peut prendre >1s avant de
    // basculer `isError`. On élargit la fenêtre de waitFor.
    await waitFor(
      () => expect(result.current.isError).toBe(true),
      { timeout: 3_000 },
    );
    expect(result.current.error?.message).toMatch(/execution reverted/);
  });
});
