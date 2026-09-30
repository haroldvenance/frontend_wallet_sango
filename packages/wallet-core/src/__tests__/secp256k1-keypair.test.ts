import { describe, expect, it } from "vitest";

import {
  deriveEthereumAddress,
  secp256k1KeypairFromPrivateKey,
  secp256k1SignDigest,
  secp256k1SignMessage,
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

// Golden vectors Hardhat / Anvil (publics, documentés).
const ANVIL_PRIVKEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ANVIL_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

describe("secp256k1 keypair", () => {
  it("derives the Anvil/0 address from the well-known private key", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const addr = deriveEthereumAddress(kp.publicKeyUncompressed);
    expect(toHex(addr)).toBe(ANVIL_ADDRESS_0);
  });

  it("produces a 33-byte compressed and 65-byte uncompressed public key", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    expect(kp.publicKeyCompressed).toHaveLength(33);
    expect(kp.publicKeyUncompressed).toHaveLength(65);
    expect(kp.publicKeyUncompressed[0]).toBe(0x04);
  });

  it("rejects a private key of wrong length", () => {
    expect(() => secp256k1KeypairFromPrivateKey(new Uint8Array(31))).toThrow(
      /exactly 32 bytes/,
    );
  });

  it("rejects an uncompressed pubkey without the 0x04 prefix", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const bad = new Uint8Array(kp.publicKeyUncompressed);
    bad[0] = 0x03;
    expect(() => deriveEthereumAddress(bad)).toThrow(/0x04/);
  });
});

describe("secp256k1 sign/verify", () => {
  it("signs deterministically (RFC 6979)", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const a = secp256k1SignDigest(kp, digest);
    const b = secp256k1SignDigest(kp, digest);
    expect(a).toEqual(b);
    expect(a).toHaveLength(64);
  });

  it("verifies its own signature", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const sig = secp256k1SignDigest(kp, digest);
    expect(secp256k1Verify(kp.publicKeyCompressed, digest, sig)).toBe(true);
    expect(secp256k1Verify(kp.publicKeyUncompressed, digest, sig)).toBe(true);
  });

  it("rejects a tampered digest", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const sig = secp256k1SignDigest(kp, digest);
    const tampered = new Uint8Array(32).fill(0x43);
    expect(secp256k1Verify(kp.publicKeyCompressed, tampered, sig)).toBe(false);
  });

  it("rejects a wrong public key", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const other = secp256k1KeypairFromPrivateKey(new Uint8Array(32).fill(0x99));
    const digest = new Uint8Array(32).fill(0x42);
    const sig = secp256k1SignDigest(kp, digest);
    expect(secp256k1Verify(other.publicKeyCompressed, digest, sig)).toBe(false);
  });

  it("secp256k1SignMessage hashes first then signs", async () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const message = new TextEncoder().encode("hello");
    const sig = secp256k1SignMessage(kp, message);
    expect(sig).toHaveLength(64);

    const { keccak_256 } = await import("@noble/hashes/sha3.js");
    const digest = keccak_256(message);
    expect(secp256k1Verify(kp.publicKeyCompressed, digest, sig)).toBe(true);
  });

  it("snapshot: signature on fixed digest is stable", () => {
    const kp = secp256k1KeypairFromPrivateKey(fromHex(ANVIL_PRIVKEY_0));
    const digest = new Uint8Array(32).fill(0x42);
    const sig = secp256k1SignDigest(kp, digest);
    expect(toHex(sig)).toMatchSnapshot();
  });
});
