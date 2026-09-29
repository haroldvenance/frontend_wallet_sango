import { describe, expect, it, vi } from "vitest";
import { SangoHistoryProvider } from "../history-provider";
import { mockRpc } from "./_helpers";
import type { SangoRpcTx } from "../rpc";

const ADDR = "0x" + "aa".repeat(20);

function tx(overrides: Partial<SangoRpcTx> = {}): SangoRpcTx {
  return {
    hash: "0x" + "ee".repeat(32),
    blockHeight: 42,
    blockHash: "0x" + "cc".repeat(32),
    txIndex: 0,
    kind: "native",
    nonce: 0,
    sender: ADDR,
    recipient: "0x" + "bb".repeat(20),
    value: "1000",
    txKind: 1,
    gasLimit: 21000,
    maxFee: "20",
    priorityFee: "2",
    data: "0x",
    success: true,
    gasUsed: 21000,
    ...overrides,
  };
}

describe("SangoHistoryProvider", () => {
  it("maps confirmed txs", async () => {
    const rpc = mockRpc({
      getTransactionsByAddress: vi.fn(async () => ({
        total: 1,
        offset: 0,
        limit: 20,
        items: [tx()],
      })),
    });
    const p = new SangoHistoryProvider(rpc, "sango-devnet");
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    expect(h.total).toBe(1);
    expect(h.items[0]!.status).toBe("confirmed");
    expect(h.items[0]!.blockHeight).toBe(42);
    expect(h.items[0]!.amount).toBe(1000n);
    expect(h.items[0]!.assetRef.kind).toBe("native");
  });

  it("maps pending txs (blockHeight=null)", async () => {
    const rpc = mockRpc({
      getTransactionsByAddress: vi.fn(async () => ({
        total: 1,
        offset: 0,
        limit: 20,
        items: [tx({ blockHeight: null })],
      })),
    });
    const p = new SangoHistoryProvider(rpc, "sango-devnet");
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    expect(h.items[0]!.status).toBe("pending");
    expect(h.items[0]!.blockHeight).toBeUndefined();
  });

  it("maps failed txs (success=false)", async () => {
    const rpc = mockRpc({
      getTransactionsByAddress: vi.fn(async () => ({
        total: 1,
        offset: 0,
        limit: 20,
        items: [tx({ success: false })],
      })),
    });
    const p = new SangoHistoryProvider(rpc, "sango-devnet");
    const h = await p.getHistory({ address: ADDR, limit: 20 });
    expect(h.items[0]!.status).toBe("failed");
  });

  it("passes offset through", async () => {
    const get = vi.fn(async () => ({
      total: 0,
      offset: 10,
      limit: 5,
      items: [],
    }));
    const p = new SangoHistoryProvider(mockRpc({ getTransactionsByAddress: get }), "sango-devnet");
    await p.getHistory({ address: ADDR, limit: 5, offset: 10 });
    expect(get).toHaveBeenCalledWith(ADDR, 5, 10);
  });
});
