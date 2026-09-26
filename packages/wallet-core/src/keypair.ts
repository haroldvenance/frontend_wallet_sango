import * as ed25519 from "@noble/ed25519";

import type { Ed25519Keypair } from "./types";

const SEED_LENGTH = 32;
const PUBLIC_KEY_LENGTH = 32;
const SECRET_KEY_LENGTH = 32;

function assertLength(
  value: Uint8Array,
  expected: number,
  name: string,
): void {
  if (value.length !== expected) {
    throw new Error(
      `${name} must be exactly ${expected} bytes, got ${value.length}`,
    );
  }
}

/**
 * Génère une nouvelle paire de clés Ed25519 native Sango.
 *
 * Le secretKey correspond au seed Ed25519 de 32 bytes,
 * conformément à NativeKeypair::from_seed côté Rust.
 */
export async function generateKeypair(): Promise<Ed25519Keypair> {
  const secretKey = ed25519.utils.randomSecretKey();

  assertLength(secretKey, SEED_LENGTH, "Ed25519 secret key");

  const publicKey = await ed25519.getPublicKeyAsync(secretKey);

  assertLength(publicKey, PUBLIC_KEY_LENGTH, "Ed25519 public key");

  return {
    publicKey,
    secretKey,
  };
}

/**
 * Reconstruit une paire de clés depuis un seed Ed25519 de 32 bytes.
 *
 * Cette fonction correspond conceptuellement à :
 *
 * NativeKeypair::from_seed([u8; 32])
 */
export async function keypairFromSeed(
  seed: Uint8Array,
): Promise<Ed25519Keypair> {
  assertLength(seed, SEED_LENGTH, "Ed25519 seed");

  const secretKey = new Uint8Array(seed);
  const publicKey = await ed25519.getPublicKeyAsync(secretKey);

  assertLength(publicKey, PUBLIC_KEY_LENGTH, "Ed25519 public key");

  return {
    publicKey,
    secretKey,
  };
}

/**
 * Signe un payload avec une clé Ed25519 native.
 */
export async function sign(
  secretKey: Uint8Array,
  payload: Uint8Array,
): Promise<Uint8Array> {
  assertLength(secretKey, SECRET_KEY_LENGTH, "Ed25519 secret key");

  const signature = await ed25519.signAsync(payload, secretKey);

  if (signature.length !== 64) {
    throw new Error(
      `Ed25519 signature must be exactly 64 bytes, got ${signature.length}`,
    );
  }

  return signature;
}