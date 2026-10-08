import { describe, expect, it } from "vitest";

import {
  slip10DeriveChildHardened,
  slip10DerivePath,
  slip10Master,
} from "../slip10";

/**
 * Vecteurs officiels SLIP-0010 §3.1
 * https://github.com/satoshilabs/slips/blob/master/slip-0010.md
 *
 * Le test « nœud maître m » et les deux suivants doivent passer
 * **bit à bit** — c'est le contrat d'interopérabilité TS ↔ Rust
 * (voir docs/design/hd-derivation.md §3.1, §4).
 */

const hex = (s: string): Uint8Array =>
  Uint8Array.from(s.match(/.{2}/g)!.map((b) => Number.parseInt(b, 16)));

const toHex = (u: Uint8Array): string =>
  Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");

describe("SLIP-0010 — vecteurs officiels §3.1 (Ed25519)", () => {
  const SEED = hex("000102030405060708090a0b0c0d0e0f");

  it("nœud maître m", () => {
    const node = slip10Master(SEED);
    expect(toHex(node.privateKey)).toBe(
      "2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7",
    );
    expect(toHex(node.chainCode)).toBe(
      "90046a93de5380a72b5e45010748567d5ea02bbf6522f979e05c0d8d8ca9fffb",
    );
  });

  it("m/0'", () => {
    const node = slip10DerivePath(SEED, [0]);
    expect(toHex(node.privateKey)).toBe(
      "68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3",
    );
    expect(toHex(node.chainCode)).toBe(
      "8b59aa11380b624e81507a27fedda59fea6d0b779a778918a2fd3590e16e9c69",
    );
  });

  it("m/0'/1'", () => {
    const node = slip10DerivePath(SEED, [0, 1]);
    expect(toHex(node.privateKey)).toBe(
      "b1d0bad404bf35da785a64ca1ac54b2617211d2777696fbffaf208f746ae84f2",
    );
    // Vecteur officiel SLIP-0010 §3.1 (ext_prv = priv ‖ chainCode).
    // Confirmé par `node:crypto` native HMAC-SHA512.
    expect(toHex(node.chainCode)).toBe(
      "a320425f77d1b5c2505a6b1b27382b37368ee640e3557c315416801243552f14",
    );
  });
});

describe("SLIP-0010 — garde-fous", () => {
  const SEED = new Uint8Array(32).fill(0xab);

  it("refuse un seed < 16 bytes", () => {
    expect(() => slip10Master(new Uint8Array(8))).toThrow(/16\.\.64/);
  });

  it("refuse un seed > 64 bytes", () => {
    expect(() => slip10Master(new Uint8Array(65))).toThrow(/16\.\.64/);
  });

  it("refuse un index ≥ 2^31 (double-durcification)", () => {
    const node = slip10Master(SEED);
    expect(() => slip10DeriveChildHardened(node, 0x80000000)).toThrow(
      /0\.\.2\^31-1/,
    );
  });

  it("refuse un index négatif ou non-entier", () => {
    const node = slip10Master(SEED);
    expect(() => slip10DeriveChildHardened(node, -1)).toThrow();
    expect(() => slip10DeriveChildHardened(node, 1.5)).toThrow();
  });

  it("chemin vide = nœud maître", () => {
    const a = slip10DerivePath(SEED, []);
    const b = slip10Master(SEED);
    expect(toHex(a.privateKey)).toBe(toHex(b.privateKey));
    expect(toHex(a.chainCode)).toBe(toHex(b.chainCode));
  });
});
