import { describe, expect, it } from "vitest";

import {
  decodeTransaction,
  encodeTransaction,
  encodeUnsignedTransaction,
  transactionHash,
  TX_KIND,
  type Transaction,
} from "./serialization";

function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function sample(): Transaction {
  return {
    version: 1,
    chainId: new Uint8Array(32).fill(0x11),
    nonce: 0n,
    sender: new Uint8Array(20).fill(0xaa),
    publicKey: null,
    gasLimit: 21_000n,
    maxFee: 20n,
    priorityFee: 2n,
    value: 1_000_000n,
    txKind: TX_KIND.Transfer,
    recipient: new Uint8Array(20).fill(0xbb),
    data: new Uint8Array(0),
    signature: new Uint8Array(64).fill(0xcc),
  };
}

describe("Transaction codec", () => {
  it("round-trips", () => {
    const tx = sample();
    expect(decodeTransaction(encodeTransaction(tx))).toEqual(tx);
  });

  it("unsigned encoding size is 147 (publicKey None, recipient Some, data empty)", () => {
    const size = encodeUnsignedTransaction(sample()).length;
    expect(size).toBe(147);
  });

  it("publicKey Some adds 32 bytes", () => {
    const tx = sample();
    const withPk = { ...tx, publicKey: new Uint8Array(32).fill(0x01) };
    expect(encodeUnsignedTransaction(withPk).length).toBe(147 + 32);
  });

  it("recipient None removes 20 bytes", () => {
    const tx = sample();
    const noR = { ...tx, recipient: null };
    expect(encodeUnsignedTransaction(noR).length).toBe(147 - 20);
  });

  it("data length is prefixed (u32 LE)", () => {
    const tx = { ...sample(), data: new Uint8Array(5).fill(0x99) };
    const bytes = encodeUnsignedTransaction(tx);
    const idx = bytes.length - 5;
    expect(bytes[idx - 4]).toBe(0x05);
    expect(bytes[idx - 3]).toBe(0x00);
    expect(bytes[idx - 2]).toBe(0x00);
    expect(bytes[idx - 1]).toBe(0x00);
  });

  it("transactionHash is deterministic", () => {
    const tx = sample();
    expect(transactionHash(tx)).toEqual(transactionHash(tx));
  });

  /**
   * **Golden vector** fourni par le backend (test Rust
   * `golden_vector_fixed_transaction` dans `sango-types::transaction`).
   *
   * Toute divergence d'un seul byte = bug dans l'un des deux codecs.
   */
  it("matches the Rust golden vector", () => {
    const tx: Transaction = {
      version: 1,
      chainId: new Uint8Array(32).fill(0x11),
      nonce: 42n,
      sender: new Uint8Array(20).fill(0xaa),
      publicKey: null,
      gasLimit: 21_000n,
      maxFee: 20n,
      priorityFee: 2n,
      value: 100n,
      txKind: TX_KIND.Transfer,
      recipient: new Uint8Array(20).fill(0xbb),
      data: new Uint8Array(0),
      signature: new Uint8Array(64),
    };

    const unsigned = encodeUnsignedTransaction(tx);
    const full = encodeTransaction(tx);
    const hash = transactionHash(tx);

    expect(unsigned.length).toBe(147);
    expect(full.length).toBe(211);

    expect(toHex(unsigned)).toBe(
      "0x01000000" +
      "1111111111111111111111111111111111111111111111111111111111111111" +
      "2a00000000000000" +
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
      "00" +
      "0852000000000000" +
      "14000000000000000000000000000000" +
      "02000000000000000000000000000000" +
      "64000000000000000000000000000000" +
      "01" +
      "01" +
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" +
      "00000000"
    );

    expect(toHex(hash)).toBe(
      "0x59e52128cf567408e038a076e15f575b0a505657f8e0bb885d5e12359b09aaf0",
    );
  });
});
