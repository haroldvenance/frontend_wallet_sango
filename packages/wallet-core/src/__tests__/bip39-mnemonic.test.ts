import { describe, expect, it } from "vitest";

import {
  generateMnemonic,
  mnemonicToSeed,
  mnemonicToSeedSync,
  validateMnemonic,
} from "../bip39";

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

describe("generateMnemonic", () => {
  it("generates a valid 12-word mnemonic by default", () => {
    const m = generateMnemonic();
    expect(m.split(" ")).toHaveLength(12);
    expect(validateMnemonic(m)).toBe(true);
  });

  it("supports all BIP-39 strengths", () => {
    expect(generateMnemonic(128).split(" ")).toHaveLength(12);
    expect(generateMnemonic(160).split(" ")).toHaveLength(15);
    expect(generateMnemonic(192).split(" ")).toHaveLength(18);
    expect(generateMnemonic(224).split(" ")).toHaveLength(21);
    expect(generateMnemonic(256).split(" ")).toHaveLength(24);
  });

  it("rejects invalid strengths", () => {
    expect(() => generateMnemonic(100 as 128)).toThrow(/Invalid mnemonic strength/);
  });
});

describe("validateMnemonic", () => {
  it("accepts the Hardhat mnemonic", () => {
    expect(validateMnemonic(HARDHAT_MNEMONIC)).toBe(true);
  });

  it("rejects a corrupted checksum", () => {
    const corrupted = HARDHAT_MNEMONIC.replace(/junk$/, "zoo");
    expect(validateMnemonic(corrupted)).toBe(false);
  });

  it("rejects non-wordlist tokens", () => {
    expect(validateMnemonic("foo bar baz")).toBe(false);
  });
});

describe("mnemonicToSeed", () => {
  it("produces a 64-byte seed", () => {
    const seed = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    expect(seed).toHaveLength(64);
  });

  it("sync and async produce identical bytes", async () => {
    const sync = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    const async = await mnemonicToSeed(HARDHAT_MNEMONIC);
    expect(sync).toEqual(async);
  });

  it("is deterministic", () => {
    const a = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    const b = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    expect(a).toEqual(b);
  });

  it("rejects an invalid mnemonic", () => {
    expect(() => mnemonicToSeedSync("foo bar baz")).toThrow(/Invalid BIP-39/);
  });

  it("a non-empty passphrase changes the seed completely", () => {
    const a = mnemonicToSeedSync(HARDHAT_MNEMONIC);
    const b = mnemonicToSeedSync(HARDHAT_MNEMONIC, "extra");
    expect(a).not.toEqual(b);
  });
});
