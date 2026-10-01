import { describe, expect, it, vi } from "vitest";

import { EvmHistoryProvider } from "../history-provider";
import type { EvmIndexer, EvmIndexerTx } from "../indexer";
import { asAddress } from "../../types/address";

const ADDR = asAddress("aa".repeat(20));
const OTHER = asAddress("bb".repeat(20));
const HASH = "0x" + "ee".repeat(32);

function tx(overrides: Partial<EvmIndexerTx> = {}): EvmIndexerTx {
  return {
    hash: HASH,
    blockNumber: 42,
    timestamp: 1_700_000_000,
    from: ADDR,
    to: OTHER,
    value: "1000000000000000000",
    isError: false,
    ...overrides,
  };
}

function mockIndexer(items: EvmIndexerTx[] = [tx()]): EvmIndexer {
  return {
    getTransactionsByAddress: vi.fn(async () => ({
      total: items.length,
      items,
    })),
  };
}

describe("EvmHistoryProvider", () => {
  it("converts a confirmed transfer", async () => {
    const p = new EvmHistoryProvider(mockIndexer(), "ethereum-sepolia");
    const h = await p.getHistory({ address: ADDR, limit: 20 });

    expect(h.total).toBe(1);
    expect(h.items[0]!.txHash).toBe(HASH);
    expect(h.items[0]!.status).toBe("confirmed");
    expect(h.items[0]!.blockHeight).toBe(42);
    expect(h.items[0]!.timestamp).toBe(1_700_000_000);
    expect(h.items[0]!.from).toBe(ADDR);
    expect(h.items[0]!.to).toBe(OTHER);
    expect(h.items[0]!.amount).toBe(1_000_000_000_000_000_000n);
    expect(h.items[0]!.assetRef.kind).toBe("native");
    expect(h.items[0]!.assetRef).toMatchObject({ assetId: "eth" });
  });

  it("marks failed txs as status 'failed'", async () => {
    const p = new EvmHistoryProvider(
      mockIndexer([tx({ isError: true })]),
      "ethereum-sepolia",
    );
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    expect(h.items[0]!.status).toBe("failed");
  });

  it("marks pending txs (blockNumber 0)", async () => {
    const p = new EvmHistoryProvider(
      mockIndexer([tx({ blockNumber: 0, timestamp: 0 })]),
      "ethereum-sepolia",
    );
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    expect(h.items[0]!.status).toBe("pending");
    expect(h.items[0]!.blockHeight).toBeUndefined();
  });

  it("handles contract creation (to === null)", async () => {
    const p = new EvmHistoryProvider(
      mockIndexer([tx({ to: null })]),
      "ethereum-sepolia",
    );
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    // La chaîne "0x000…000" remplace null.
    expect(h.items[0]!.to).toBe("0x" + "0".repeat(40));
  });

  it("forwards limit + offset to the indexer", async () => {
    const indexer = mockIndexer();
    const p = new EvmHistoryProvider(indexer, "ethereum-sepolia");
    await p.getHistory({ address: ADDR, limit: 5, offset: 10 });
    expect(indexer.getTransactionsByAddress).toHaveBeenCalledWith(ADDR, 5, 10);
  });

  it("defaults offset to 0", async () => {
    const indexer = mockIndexer();
    const p = new EvmHistoryProvider(indexer, "ethereum-sepolia");
    await p.getHistory({ address: ADDR, limit: 20 });
    expect(indexer.getTransactionsByAddress).toHaveBeenCalledWith(ADDR, 20, 0);
  });

  it("returns empty page when the indexer has no items", async () => {
    const p = new EvmHistoryProvider(mockIndexer([]), "ethereum-sepolia");
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    expect(h.total).toBe(0);
    expect(h.items).toEqual([]);
  });

  it("propagates indexer errors", async () => {
    const indexer: EvmIndexer = {
      getTransactionsByAddress: vi.fn(async () => {
        throw new Error("Rate limited");
      }),
    };
    const p = new EvmHistoryProvider(indexer, "ethereum-sepolia");
    await expect(p.getHistory({ address: ADDR, limit: 20 })).rejects.toThrow(
      "Rate limited",
    );
  });

  it("fills networkId from the constructor", async () => {
    const p = new EvmHistoryProvider(mockIndexer(), "base");
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    expect(h.items[0]!.networkId).toBe("base");
    expect(h.items[0]!.assetRef).toMatchObject({ networkId: "base" });
  });
});
