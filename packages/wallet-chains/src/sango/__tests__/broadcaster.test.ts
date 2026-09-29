import { describe, expect, it, vi } from "vitest";
import { SangoBroadcaster } from "../broadcaster";
import { mockRpc } from "./_helpers";
import type { SignedTransaction } from "../../types/tx";

function signed(raw: Uint8Array): SignedTransaction {
  return {
    unsigned: {
      family: "sango",
      networkId: "sango-devnet",
      payload: {},
      meta: {
        from: "0x" + "aa".repeat(20),
        to: "0x" + "bb".repeat(20),
        assetRef: { kind: "native", assetId: "sango", networkId: "sango-devnet" },
        amount: 1n,
      },
    },
    raw,
    txHash: "0x" + "00".repeat(32),
  };
}

describe("SangoBroadcaster", () => {
  it("forwards raw bytes as 0x-hex to sango_sendTransaction", async () => {
    const send = vi.fn(async () => "0x" + "ee".repeat(32));
    const b = new SangoBroadcaster(mockRpc({ sendTransaction: send }));
    const hash = await b.broadcast(signed(new Uint8Array([1, 2, 3, 255])));
    expect(send).toHaveBeenCalledWith("0x010203ff");
    expect(hash).toBe("0x" + "ee".repeat(32));
  });
});
