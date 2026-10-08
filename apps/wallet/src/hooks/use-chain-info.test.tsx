import { asPublicKey } from "@sango/wallet-chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChainInfo } from "@sango/rpc";
import type { SangoClient } from "@sango/sdk";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useChainInfo } from "./use-chain-info";

const FIXTURE_CHAIN_INFO: ChainInfo = {
  chainId: (asPublicKey("11".repeat(32))) as ChainInfo["chainId"],
  height: 100,
  validatorCount: 3,
  protocolVersion: 1,
};

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

/**
 * ⚠️ gcTime élevé (60s) et non 0 : certains tests inspectent le cache
 *    après rerender, et gcTime=0 évince les clés dès qu'elles ne sont
 *    plus observées. L'isolation inter-tests est assurée par un
 *    QueryClient neuf par test.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
  });
}

beforeEach(() => {
  useWalletStore.setState({ network: "testnet", format: "sango-legacy" });
  useSdkStore.setState({
    endpoint: "http://test",
    customEndpoint: null,
  });
});

describe("useChainInfo (query key convention)", () => {
  it('uses ["chain-info", endpoint, networkId] as query key', async () => {
    const getChainInfo = vi.fn(async () => FIXTURE_CHAIN_INFO);
    useSdkStore.setState({
      client: { getChainInfo } as unknown as SangoClient,
    });

    const qc = makeQueryClient();
    const { result } = renderHook(() => useChainInfo(), {
      wrapper: makeWrapper(qc),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(FIXTURE_CHAIN_INFO);

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual(["chain-info", "http://test", "sango-devnet"]);
  });

  it("refetches when endpoint changes (query key includes endpoint)", async () => {
    const getChainInfo = vi.fn(async () => FIXTURE_CHAIN_INFO);
    useSdkStore.setState({
      client: { getChainInfo } as unknown as SangoClient,
    });

    const qc = makeQueryClient();
    renderHook(() => useChainInfo(), { wrapper: makeWrapper(qc) });
    await waitFor(() => expect(getChainInfo).toHaveBeenCalled());

    const callsBefore = getChainInfo.mock.calls.length;

    // Change l'endpoint → nouvelle clé → nouvelle query → nouvel appel.
    useSdkStore.setState({ endpoint: "http://other" });

    // Assertion robuste : au moins un nouvel appel (peu importe combien).
    await waitFor(() =>
      expect(getChainInfo.mock.calls.length).toBeGreaterThan(callsBefore),
    );

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual(["chain-info", "http://test", "sango-devnet"]);
    expect(keys).toContainEqual(["chain-info", "http://other", "sango-devnet"]);
  });
});