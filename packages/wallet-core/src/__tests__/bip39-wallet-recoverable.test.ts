import { describe, expect, it } from "vitest";

import { Bip39Wallet } from "../bip39-wallet";
import { deriveEthereumAddress } from "../secp256k1";

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";
const HARDHAT_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

describe("Bip39Wallet — extensions patch 5.a", () => {
  it("getIdentity exposes publicKeyUncompressed (65 bytes, 0x04)", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const id = w.getIdentity(0);
    expect(id.publicKeyUncompressed).toHaveLength(65);
    expect(id.publicKeyUncompressed[0]).toBe(0x04);
  });

  it("publicKeyUncompressed derives the correct Ethereum address", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const id = w.getIdentity(0);
    const addr = deriveEthereumAddress(id.publicKeyUncompressed);
    const hex = "0x" + Array.from(addr, (b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toBe(HARDHAT_ADDRESS_0);
  });

  it("signDigestRecoverable returns compact + recovery", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const digest = new Uint8Array(32).fill(0x42);
    const sig = await w.signDigestRecoverable(digest);
    expect(sig.compact).toHaveLength(64);
    expect([0, 1]).toContain(sig.recovery);
  });

  it("signDigestRecoverable is deterministic", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const digest = new Uint8Array(32).fill(0x42);
    const a = await w.signDigestRecoverable(digest);
    const b = await w.signDigestRecoverable(digest);
    expect(a.compact).toEqual(b.compact);
    expect(a.recovery).toBe(b.recovery);
  });

  it("signDigestRecoverable rejects non-32-byte digest", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    await expect(
      w.signDigestRecoverable(new Uint8Array(31)),
    ).rejects.toThrow(/32 bytes/);
  });

  it("signDigestRecoverable fails after destroy", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    w.destroy();
    await expect(
      w.signDigestRecoverable(new Uint8Array(32)),
    ).rejects.toThrow(/destroyed/);
  });
});
