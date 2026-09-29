import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EvmBlock } from "@sango/rpc";
import type { SangoClient } from "@sango/sdk";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useRecentBlocks } from "./use-recent-blocks";

const FIXTURE_BLOCKS: EvmBlock[] = [
  {
    number: "0x1",
    hash: ("0x" + "aa".repeat(32)) as EvmBlock["hash"],
    parentHash: ("0x" + "00".repeat(32)) as EvmBlock["parentHash"],
    timestamp: "0x0",
    gasLimit: "0x0",
    gasUsed: "0x0",
    miner: ("0x" + "00".repeat(20)) as EvmBlock["miner"],
    transactions: [],
    transactionsRoot: ("0x" + "00".repeat(32)) as EvmBlock["transactionsRoot"],
    stateRoot: ("0x" + "00".repeat(32)) as EvmBlock["stateRoot"],
    receiptsRoot: ("0x" + "00".repeat(32)) as EvmBlock["receiptsRoot"],
  },
];

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

/** Voir use-chain-info.test.tsx — gcTime élevé pour inspecter le cache. */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
  });
}

beforeEach(() => {
  useWalletStore.setState({ network: "testnet" });
  useSdkStore.setState({
    endpoint: "http://test",
    customEndpoint: null,
  });
});

describe("useRecentBlocks (query key convention)", () => {
  it('uses ["recent-blocks", endpoint, networkId, count] as query key', async () => {
    const getRecentBlocks = vi.fn(async () => FIXTURE_BLOCKS);
    useSdkStore.setState({
      client: { getRecentBlocks } as unknown as SangoClient,
    });

    const qc = makeQueryClient();
    const { result } = renderHook(() => useRecentBlocks(5), {
      wrapper: makeWrapper(qc),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getRecentBlocks).toHaveBeenCalledWith(5);

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual([
      "recent-blocks",
      "http://test",
      "sango-devnet",
      5,
    ]);
  });

  it("uses a distinct key per count value", async () => {
    const getRecentBlocks = vi.fn(async () => FIXTURE_BLOCKS);
    useSdkStore.setState({
      client: { getRecentBlocks } as unknown as SangoClient,
    });

    const qc = makeQueryClient();
    const { rerender } = renderHook(
      ({ n }: { n: number }) => useRecentBlocks(n),
      { wrapper: makeWrapper(qc), initialProps: { n: 5 } },
    );
    await waitFor(() => expect(getRecentBlocks).toHaveBeenCalledWith(5));

    rerender({ n: 10 });
    await waitFor(() => expect(getRecentBlocks).toHaveBeenCalledWith(10));

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual([
      "recent-blocks",
      "http://test",
      "sango-devnet",
      5,
    ]);
    expect(keys).toContainEqual([
      "recent-blocks",
      "http://test",
      "sango-devnet",
      10,
    ]);
  });
});
