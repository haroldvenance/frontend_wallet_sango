import { describe, expect, it, vi } from "vitest";

import { EvmBroadcaster } from "../broadcaster";
import type { SignedTransaction } from "../../types/tx";
import type { Hash } from "../../types/address";
import { mockRpc } from "./_helpers";

function makeSigned(raw: Uint8Array): SignedTransaction {
  return {
    unsigned: {
      family: "evm",
      networkId: "ethereum-sepolia",
      payload: {},
      meta: {
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        assetRef: {
          kind: "native",
          assetId: "eth",
          networkId: "ethereum-sepolia",
        },
      },
    },
    raw,
    txHash: "0x" + "00".repeat(32) as Hash,
  };
}

describe("EvmBroadcaster", () => {
  it("forwards raw bytes as 0x-hex to sendRawTransaction", async () => {
    const sendRawTransaction = vi.fn(
      async () => "0x" + "ee".repeat(32) as Hash,
    );
    const b = new EvmBroadcaster(mockRpc({ sendRawTransaction }));
    const hash = await b.broadcast(makeSigned(new Uint8Array([0x02, 0xab, 0xcd])));
    expect(sendRawTransaction).toHaveBeenCalledWith("0x02abcd");
    expect(hash).toBe("0x" + "ee".repeat(32));
  });

  it("pads single-digit bytes to 2 hex chars", async () => {
    const sendRawTransaction = vi.fn(async () => "0x" + "00".repeat(32) as Hash);
    const b = new EvmBroadcaster(mockRpc({ sendRawTransaction }));
    await b.broadcast(makeSigned(new Uint8Array([0x01, 0x0a, 0xff])));
    expect(sendRawTransaction).toHaveBeenCalledWith("0x010aff");
  });

  it("propagates RPC errors", async () => {
    const sendRawTransaction = vi.fn(async () => {
      throw new Error("nonce too low");
    });
    const b = new EvmBroadcaster(mockRpc({ sendRawTransaction }));
    await expect(
      b.broadcast(makeSigned(new Uint8Array([0x02]))),
    ).rejects.toThrow("nonce too low");
  });
});
