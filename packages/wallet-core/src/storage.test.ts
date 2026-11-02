import { describe, expect, it } from "vitest";

import { restoreWallet, Wallet } from "./wallet";

const SEED = new Uint8Array(32).fill(0x55);

/** Flip tous les bits du premier byte (XOR 0xFF). */
function flipFirstByte(u: Uint8Array): Uint8Array {
  const copy = new Uint8Array(u);
  copy[0] = copy[0] ^ 0xff;
  return copy;
}

describe("Wallet encrypted storage", () => {
  it("round-trips with correct password", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const stored = await w.exportEncrypted("correct horse battery staple");
    expect(stored.version).toBe(1);
    expect(stored.network).toBe("testnet");
    expect(stored.addressHex).toBe(
      "0x02291e07839d715a4c78b8585449b7e367aa01ab",
    );

    const restored = await Wallet.importEncrypted(
      stored,
      "correct horse battery staple",
    );
    expect(restored.identity.addressHex).toBe(w.identity.addressHex);
  });

  it("rejects a wrong password", async () => {
    const w = await restoreWallet(SEED);
    const stored = await w.exportEncrypted("password-one-1234");
    await expect(
      Wallet.importEncrypted(stored, "password-two-1234"),
    ).rejects.toThrow();
  });

  it("rejects a short password", async () => {
    const w = await restoreWallet(SEED);
    await expect(w.exportEncrypted("short")).rejects.toThrow();
  });

  it("rejects tampered ciphertext", async () => {
    const w = await restoreWallet(SEED);
    const stored = await w.exportEncrypted("correct horse battery staple");
    const tampered = {
      ...stored,
      ciphertext: flipFirstByte(stored.ciphertext),
    };
    await expect(
      Wallet.importEncrypted(tampered, "correct horse battery staple"),
    ).rejects.toThrow();
  });

  it("rejects tampered IV", async () => {
    const w = await restoreWallet(SEED);
    const stored = await w.exportEncrypted("correct horse battery staple");
    const tampered = { ...stored, iv: flipFirstByte(stored.iv) };
    await expect(
      Wallet.importEncrypted(tampered, "correct horse battery staple"),
    ).rejects.toThrow();
  });

  it("rejects tampered salt", async () => {
    const w = await restoreWallet(SEED);
    const stored = await w.exportEncrypted("correct horse battery staple");
    const tampered = { ...stored, salt: flipFirstByte(stored.salt) };
    await expect(
      Wallet.importEncrypted(tampered, "correct horse battery staple"),
    ).rejects.toThrow();
  });
});