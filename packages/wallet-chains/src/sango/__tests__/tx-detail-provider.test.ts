import { describe, expect, it, vi } from "vitest";
import { SangoTxDetailProvider } from "../tx-detail-provider";
import { mockRpc } from "./_helpers";
import { asAddress, asHash, asPublicKey } from "../../types/address";

const SENDER = asAddress("aa".repeat(20));
const RECIPIENT = asAddress("bb".repeat(20));
const HASH = asHash("ee".repeat(32));
const PUBKEY = asPublicKey("cc".repeat(32));

const FIXTURE_TX = {
  hash: HASH,
  kind: "native" as const,
  blockHeight: 42,
  blockHash: asHash("dd".repeat(32)),
  txIndex: 0,
  version: 1,
  chainId: asHash("11".repeat(32)),
  nonce: 7,
  sender: SENDER,
  publicKey: PUBKEY,
  gasLimit: 21_000,
  maxFee: "20",
  priorityFee: "2",
  value: "100",
  txKind: 0x01,
  recipient: RECIPIENT,
  data: asHash(""),
  signature: asHash("ee".repeat(64)),
  success: true,
  gasUsed: 21_000,
};

describe("SangoTxDetailProvider", () => {
  it("getTransactionByHash forwards the hash", async () => {
    const getTransactionByHash = vi.fn(async () => FIXTURE_TX);
    const p = new SangoTxDetailProvider(mockRpc({ getTransactionByHash }));
    const tx = await p.getTransactionByHash(HASH);
    expect(getTransactionByHash).toHaveBeenCalledWith(HASH);
    expect(tx).not.toBeNull();
    expect(tx!.hash).toBe(HASH);
    expect(tx!.nonce).toBe(7);
    expect(tx!.txKind).toBe(0x01);
    expect(tx!.sender).toBe(SENDER);
    expect(tx!.recipient).toBe(RECIPIENT);
  });

  it("getTransactionByHash returns null for unknown", async () => {
    const p = new SangoTxDetailProvider(mockRpc());
    expect(await p.getTransactionByHash(HASH)).toBeNull();
  });

  it("getTransactionsByAddress forwards (address, limit, offset)", async () => {
    const getTransactionsByAddress = vi.fn(async () => ({
      total: 1,
      offset: 0,
      limit: 20,
      items: [FIXTURE_TX],
    }));
    const p = new SangoTxDetailProvider(mockRpc({ getTransactionsByAddress }));
    const page = await p.getTransactionsByAddress(SENDER, 20, 0);
    expect(getTransactionsByAddress).toHaveBeenCalledWith(SENDER, 20, 0);
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.hash).toBe(HASH);
  });

  it("propagates RPC errors", async () => {
    const getTransactionByHash = vi.fn(async () => {
      throw new Error("RPC down");
    });
    const p = new SangoTxDetailProvider(mockRpc({ getTransactionByHash }));
    await expect(p.getTransactionByHash(HASH)).rejects.toThrow("RPC down");
  });
});
