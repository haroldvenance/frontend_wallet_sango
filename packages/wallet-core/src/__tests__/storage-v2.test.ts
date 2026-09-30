import { describe, expect, it } from "vitest";

import { Bip39Wallet } from "../bip39-wallet";
import { Wallet, restoreWallet } from "../wallet";

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";
const HARDHAT_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

describe("Bip39Wallet encrypted storage (V2)", () => {
  it("round-trips with correct password", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const stored = await w.exportEncrypted("correct horse battery staple");

    expect(stored.version).toBe(2);
    expect(stored.format).toBe("bip39");
    expect(stored.addressHex).toBe(HARDHAT_ADDRESS_0);
    expect(stored.network).toBe("testnet"); // défaut, cf. StoredWalletV2
    expect(stored.kdf).toBe("PBKDF2-SHA256");
    // AES-GCM ajoute 16 bytes de tag d'authentification :
    // seed 64 bytes → ciphertext = 64 + 16 = 80 bytes.
    expect(stored.ciphertext).toHaveLength(80);

    const restored = await Bip39Wallet.importEncrypted(
      stored,
      "correct horse battery staple",
    );
    expect(restored.defaultAddress).toBe(w.defaultAddress);
  });

  it("rejects a wrong password", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const stored = await w.exportEncrypted("password-one-1234");
    await expect(
      Bip39Wallet.importEncrypted(stored, "password-two-1234"),
    ).rejects.toThrow(/Invalid password or corrupted/);
  });

  it("rejects a short password at export", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    await expect(w.exportEncrypted("short")).rejects.toThrow(
      /at least 8 characters/,
    );
  });

  it("Bip39Wallet.importEncrypted refuses a V1 (SANGO legacy) wallet", async () => {
    const legacy = await restoreWallet(new Uint8Array(32).fill(0x55), "testnet");
    const storedV1 = await legacy.exportEncrypted("password-1234");
    await expect(
      Bip39Wallet.importEncrypted(storedV1, "password-1234"),
    ).rejects.toThrow(/expected version 2.*got 1/);
  });

  it("Wallet.importEncrypted refuses a V2 (BIP-39) wallet", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const storedV2 = await w.exportEncrypted("password-1234");
    await expect(
      Wallet.importEncrypted(storedV2, "password-1234"),
    ).rejects.toThrow(/expected version 1.*got 2/);
  });

  it("legacy SANGO round-trip still works (V1 unchanged)", async () => {
    const legacy = await restoreWallet(new Uint8Array(32).fill(0x55), "testnet");
    const stored = await legacy.exportEncrypted("password-1234");
    expect(stored.version).toBe(1);
    const restored = await Wallet.importEncrypted(stored, "password-1234");
    expect(restored.identity.addressHex).toBe(
      "0x02291e07839d715a4c78b8585449b7e367aa01ab",
    );
  });
});
