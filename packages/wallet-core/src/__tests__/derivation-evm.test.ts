import { describe, expect, it } from "vitest";

import { mnemonicToSeedSync } from "../bip39";
import { deriveEthereumAddress } from "../secp256k1";
import {
  EVM_DEFAULT_PATH,
  deriveEvmKeypair,
  formatBip44Path,
  parseBip44Path,
} from "../derivation";

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

const HARDHAT_PRIVKEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const HARDHAT_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

function toHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("BIP-44 path parser", () => {
  it("parses the EVM default path", () => {
    const parts = parseBip44Path("m/44'/60'/0'/0/0");
    expect(parts).toEqual({
      purpose: 44,
      coinType: 60,
      account: 0,
      change: 0,
      index: 0,
    });
  });

  it("accepts h/H as hardened markers", () => {
    const a = parseBip44Path("m/44'/60'/0'/0/0");
    const b = parseBip44Path("m/44h/60H/0'/0/0");
    expect(a).toEqual(b);
  });

  it("round-trips via formatBip44Path", () => {
    const parts = parseBip44Path("m/44'/60'/0'/0/7");
    expect(formatBip44Path(parts)).toBe("m/44'/60'/0'/0/7");
  });

  it("rejects malformed paths", () => {
    expect(() => parseBip44Path("m/44/60/0/0")).toThrow(/Invalid BIP-44 path/);
    expect(() => parseBip44Path("44'/60'/0'/0/0")).toThrow(/Invalid BIP-44 path/);
    expect(() => parseBip44Path("")).toThrow(/Invalid BIP-44 path/);
  });

  it("EVM_DEFAULT_PATH is the canonical m/44'/60'/0'/0/0", () => {
    expect(EVM_DEFAULT_PATH).toBe("m/44'/60'/0'/0/0");
  });
});

describe("deriveEvmKeypair", () => {
  it("derives the Hardhat/Anvil private key #0", () => {
    const seed = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    const kp = deriveEvmKeypair(seed, 0);
    expect(toHex(kp.privateKey)).toBe(HARDHAT_PRIVKEY_0);
  });

  it("derives the Hardhat/Anvil address #0", () => {
    const seed = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    const kp = deriveEvmKeypair(seed, 0);
    const addr = deriveEthereumAddress(kp.publicKeyUncompressed);
    expect(toHex(addr)).toBe(HARDHAT_ADDRESS_0);
  });

  it("produces distinct keys for different indices", () => {
    const seed = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    const kp0 = deriveEvmKeypair(seed, 0);
    const kp1 = deriveEvmKeypair(seed, 1);
    expect(toHex(kp0.privateKey)).not.toBe(toHex(kp1.privateKey));
  });

  it("is deterministic", () => {
    const seed = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    const a = deriveEvmKeypair(seed, 0);
    const b = deriveEvmKeypair(seed, 0);
    expect(a.privateKey).toEqual(b.privateKey);
    expect(a.publicKeyUncompressed).toEqual(b.publicKeyUncompressed);
  });

  it("rejects a too-short seed", () => {
    expect(() => deriveEvmKeypair(new Uint8Array(8), 0)).toThrow(/at least 16 bytes/);
  });

  it("rejects a negative index", () => {
    const seed = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    expect(() => deriveEvmKeypair(seed, -1)).toThrow(/Invalid derivation index/);
  });
});
