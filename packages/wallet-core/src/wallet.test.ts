import { describe, expect, it } from "vitest";

import { createWallet, restoreWallet, Wallet } from "./wallet";
import { TX_KIND, encodeUnsignedTransaction, type UnsignedTransaction } from "./serialization";
import { verifyTransactionSignature } from "./signing";

const SEED = new Uint8Array(32).fill(0x55);

describe("Wallet", () => {
  it("from seed produces the canonical Rust identity", async () => {
    const w = await restoreWallet(SEED, "mainnet");
    expect(w.identity.addressHex).toBe(
      "0x02291e07839d715a4c78b8585449b7e367aa01ab",
    );
    expect(w.identity.addressBech32).toBe(
      "sango1qg53upurn4c45nrchpv9gjdhudn65qdtr5l9u6",
    );
  });

  it("testnet produces tsango address", async () => {
    const w = await restoreWallet(SEED, "testnet");
    expect(w.identity.addressBech32).toBe(
      "tsango1qg53upurn4c45nrchpv9gjdhudn65qdtv3xlde",
    );
  });

  it("create produces distinct wallets", async () => {
    const a = await createWallet();
    const b = await createWallet();
    expect(a.identity.addressHex).not.toBe(b.identity.addressHex);
  });

  it("signTransaction produces a verifiable signature", async () => {
    const w = await restoreWallet(SEED);
    const unsigned: UnsignedTransaction = {
      version: 1,
      chainId: new Uint8Array(32).fill(0x11),
      nonce: 0n,
      sender: w.identity.address,
      publicKey: w.identity.publicKey,
      gasLimit: 21_000n,
      maxFee: 20n,
      priorityFee: 2n,
      value: 1_000_000n,
      txKind: TX_KIND.Transfer,
      recipient: new Uint8Array(20).fill(0xbb),
      data: new Uint8Array(0),
    };
    const signed = await w.signTransaction(unsigned);
    const ok = await verifyTransactionSignature(
      w.identity.publicKey,
      encodeUnsignedTransaction(unsigned),
      signed.signature,
    );
    expect(ok).toBe(true);
  });

  it("destroy wipes the secret (subsequent signing fails)", async () => {
    const w = await restoreWallet(SEED);
    w.destroy();
    await expect(
      w.signDomain(new Uint8Array(), new Uint8Array()),
    ).rejects.toThrow();
  });
});
