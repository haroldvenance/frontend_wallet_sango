import { describe, expect, it } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";

import {
  secp256k1KeypairFromPrivateKey,
  secp256k1SignDigest,
  secp256k1SignDigestRecoverable,
  secp256k1Verify,
} from "../secp256k1";

function toHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// Golden vector Anvil/Hardhat : privkey #0
const ANVIL_PRIVKEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ANVIL_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

describe("secp256k1SignDigestRecoverable", () => {
  it("returns 64-byte compact + recovery ∈ {0, 1}", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const { compact, recovery } = secp256k1SignDigestRecoverable(kp, digest);

    expect(compact).toHaveLength(64);
    expect([0, 1]).toContain(recovery);
  });

  it("is deterministic (RFC 6979)", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const a = secp256k1SignDigestRecoverable(kp, digest);
    const b = secp256k1SignDigestRecoverable(kp, digest);

    expect(a.compact).toEqual(b.compact);
    expect(a.recovery).toBe(b.recovery);
  });

  it("compact part matches secp256k1SignDigest (same digest)", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);

    const plain = secp256k1SignDigest(kp, digest);
    const { compact } = secp256k1SignDigestRecoverable(kp, digest);

    // Les deux doivent produire les mêmes 64 bytes (r || s)
    expect(compact).toEqual(plain);
  });

  it("signature verifies with the pubkey", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const { compact } = secp256k1SignDigestRecoverable(kp, digest);

    expect(secp256k1Verify(kp.publicKeyCompressed, digest, compact)).toBe(true);
    expect(secp256k1Verify(kp.publicKeyUncompressed, digest, compact)).toBe(true);
  });

  it("recovery bit allows pubkey recovery to the correct address", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = keccak_256(new TextEncoder().encode("hello"));
    const { compact, recovery } = secp256k1SignDigestRecoverable(kp, digest);

    // Reconstitue la signature 65 bytes au format noble "recovered" :
    // [recovery, r(32), s(32)] — recovery en PREMIER byte.
    const full = new Uint8Array(65);
    full[0] = recovery;
    full.set(compact, 1);

    const recoveredPub = secp256k1.recoverPublicKey(
      full,
      digest,
      { prehash: false } as never,
    );

    // La clé publique récupérée doit matcher la clé d'origine.
    expect(toHex(recoveredPub)).toBe(toHex(kp.publicKeyCompressed));
  });

  it("produces consistent recovery across different digests", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));

    for (const fill of [0x00, 0x01, 0x42, 0xff]) {
      const digest = new Uint8Array(32).fill(fill);
      const { recovery } = secp256k1SignDigestRecoverable(kp, digest);
      expect(recovery === 0 || recovery === 1).toBe(true);
    }
  });

  it("rejects a non-32-byte digest", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    expect(() =>
      secp256k1SignDigestRecoverable(kp, new Uint8Array(31)),
    ).toThrow(/digest must be exactly 32 bytes/);
  });

  it("snapshot: recoverable signature on fixed digest is stable", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const { compact, recovery } = secp256k1SignDigestRecoverable(kp, digest);

    expect(toHex(compact)).toMatchSnapshot("compact-hex");
    expect(recovery).toMatchSnapshot("recovery-bit");
  });
});
