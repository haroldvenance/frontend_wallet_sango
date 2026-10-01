import { describe, expect, it } from "vitest";

import type { StoredWalletV2 } from "@sango/wallet-core";

import {
  deserializeBip39Keyfile,
  serializeBip39Keyfile,
  type Bip39KeyfileV1,
} from "./bip39-keyfile";

// ── Fixture : StoredWalletV2 minimal ────────────────────────

const FIXTURE: StoredWalletV2 = {
  version: 2,
  format: "bip39",
  network: "testnet", // placeholder D-NET-2
  addressHex: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  salt: new Uint8Array(16).fill(0x01),
  iv: new Uint8Array(12).fill(0x02),
  ciphertext: new Uint8Array(80).fill(0x03), // 64 seed + 16 tag
  kdf: "PBKDF2-SHA256",
  iterations: 600_000,
};

const NETWORK_ID = "ethereum-sepolia";

// ── Tests ───────────────────────────────────────────────────

describe("serializeBip39Keyfile", () => {
  it("produces a valid sango-bip39-keyfile v1", () => {
    const k = serializeBip39Keyfile(FIXTURE, NETWORK_ID);

    expect(k.format).toBe("sango-bip39-keyfile");
    expect(k.version).toBe(1);
    expect(k.networkId).toBe("ethereum-sepolia");
    expect(k.addressHex).toBe(FIXTURE.addressHex);
    expect(k.kdf).toBe("PBKDF2-SHA256");
    expect(k.iterations).toBe(600_000);
    expect(k.salt).toHaveLength(32); // 16 bytes hex
    expect(k.iv).toHaveLength(24);   // 12 bytes hex
    expect(k.ciphertext).toHaveLength(160); // 80 bytes hex
    expect(k.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects a StoredWalletV1", () => {
    const v1 = { ...FIXTURE, version: 1 } as unknown as StoredWalletV2;
    expect(() => serializeBip39Keyfile(v1, NETWORK_ID)).toThrow(
      /expected StoredWalletV2/,
    );
  });

  it("rejects a StoredWalletV2 with wrong format", () => {
    const bad = { ...FIXTURE, format: "foo" } as unknown as StoredWalletV2;
    expect(() => serializeBip39Keyfile(bad, NETWORK_ID)).toThrow(
      /expected format "bip39"/,
    );
  });
});

describe("deserializeBip39Keyfile", () => {
  it("round-trips with serialize", () => {
    const k = serializeBip39Keyfile(FIXTURE, NETWORK_ID);
    const { stored, networkId } = deserializeBip39Keyfile(k);

    expect(networkId).toBe(NETWORK_ID);
    expect(stored.version).toBe(2);
    expect(stored.format).toBe("bip39");
    expect(stored.addressHex).toBe(FIXTURE.addressHex);
    expect(stored.salt).toEqual(FIXTURE.salt);
    expect(stored.iv).toEqual(FIXTURE.iv);
    expect(stored.ciphertext).toEqual(FIXTURE.ciphertext);
    expect(stored.iterations).toBe(FIXTURE.iterations);
  });

  it("rejects a non-object", () => {
    expect(() => deserializeBip39Keyfile(null)).toThrow(/objet JSON/);
    expect(() => deserializeBip39Keyfile("string")).toThrow(/objet JSON/);
  });

  it("rejects an unknown format", () => {
    expect(() =>
      deserializeBip39Keyfile({ ...serializeBip39Keyfile(FIXTURE, NETWORK_ID), format: "foo" }),
    ).toThrow(/Format inconnu/);
  });

  it("rejects the legacy sango-wallet-keyfile format", () => {
    expect(() =>
      deserializeBip39Keyfile({
        format: "sango-wallet-keyfile",
        version: 1,
      }),
    ).toThrow(/Format inconnu/);
  });

  it("rejects a wrong version", () => {
    expect(() =>
      deserializeBip39Keyfile({
        ...serializeBip39Keyfile(FIXTURE, NETWORK_ID),
        version: 2,
      }),
    ).toThrow(/Version non supportée/);
  });

  it("rejects an empty networkId", () => {
    expect(() =>
      deserializeBip39Keyfile({
        ...serializeBip39Keyfile(FIXTURE, NETWORK_ID),
        networkId: "",
      }),
    ).toThrow(/networkId.*invalide/);
  });

  it("rejects a malformed addressHex", () => {
    expect(() =>
      deserializeBip39Keyfile({
        ...serializeBip39Keyfile(FIXTURE, NETWORK_ID),
        addressHex: "not-an-address",
      }),
    ).toThrow(/addressHex.*invalide/);
  });

  it("rejects a wrong salt length", () => {
    expect(() =>
      deserializeBip39Keyfile({
        ...serializeBip39Keyfile(FIXTURE, NETWORK_ID),
        salt: "00".repeat(8), // 8 bytes au lieu de 16
      }),
    ).toThrow(/Salt doit faire 16 bytes/);
  });

  it("rejects a wrong iv length", () => {
    expect(() =>
      deserializeBip39Keyfile({
        ...serializeBip39Keyfile(FIXTURE, NETWORK_ID),
        iv: "00".repeat(8), // 8 bytes au lieu de 12
      }),
    ).toThrow(/IV doit faire 12 bytes/);
  });

  it("rejects a wrong ciphertext length (not 80)", () => {
    expect(() =>
      deserializeBip39Keyfile({
        ...serializeBip39Keyfile(FIXTURE, NETWORK_ID),
        ciphertext: "00".repeat(64), // 64 bytes au lieu de 80
      }),
    ).toThrow(/Ciphertext doit faire 80 bytes/);
  });

  it("does not contain the mnemonic (invariant D-HD-1)", () => {
    const k = serializeBip39Keyfile(FIXTURE, NETWORK_ID) as Bip39KeyfileV1 & {
      mnemonic?: unknown;
    };
    // Aucun champ `mnemonic` ou `phrase` dans le keyfile.
    expect(k.mnemonic).toBeUndefined();
    expect("phrase" in k).toBe(false);
    // Le JSON ne contient aucune chaîne qui ressemble à une phrase
    // BIP-39 (12+ mots séparés par des espaces).
    const json = JSON.stringify(k);
    expect(json).not.toMatch(/"[a-z]{3,8}( [a-z]{3,8}){11,}"/);
  });
});
