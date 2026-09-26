import * as ed25519 from "@noble/ed25519";

/**
 * Domain separators normatifs (miroir exact de `sango_crypto::domain`).
 *
 * ⚠️ Ces valeurs sont consensus-critical : ne JAMAIS les modifier sans
 *    un hard fork coordonné avec le backend.
 */
const enc = new TextEncoder();

export const DOMAINS = Object.freeze({
  GENESIS_V1: enc.encode("SANGO/GENESIS/V1"),
  BLOCK_HEADER_V1: enc.encode("SANGO/BLOCK/HEADER/V1"),
  TX_V1: enc.encode("SANGO/TX/V1"),
  PROPOSAL_V1: enc.encode("SANGO/PROPOSAL/V1"),
  PREVOTE_V1: enc.encode("SANGO/PREVOTE/V1"),
  PRECOMMIT_V1: enc.encode("SANGO/PRECOMMIT/V1"),
  EVIDENCE_V1: enc.encode("SANGO/EVIDENCE/V1"),
  ADDRESS_V1: enc.encode("SANGO/ADDRESS/V1"),
  EVM_PREVRANDAO_V1: enc.encode("SANGO/EVM/PREVRANDAO/V1"),
  STATE_ROOT_V1: enc.encode("SANGO/STATE/ROOT/V1"),
  PROPOSER_V1: enc.encode("SANGO/PROPOSER/V1"),
});

export type DomainName = keyof typeof DOMAINS;

const SIGNATURE_LENGTH = 64;
const SECRET_KEY_LENGTH = 32;
const PUBLIC_KEY_LENGTH = 32;

function assertLength(v: Uint8Array, expected: number, name: string): void {
  if (v.length !== expected) {
    throw new Error(`${name} must be exactly ${expected} bytes, got ${v.length}`);
  }
}

function concat(domain: Uint8Array, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(domain.length + payload.length);
  msg.set(domain, 0);
  msg.set(payload, domain.length);
  return msg;
}

/**
 * Signe `domain || payload` avec Ed25519.
 *
 * Miroir exact de `sango_crypto::sign_native(keypair, domain, payload)`.
 */
export async function signNative(
  secretKey: Uint8Array,
  domain: Uint8Array,
  payload: Uint8Array,
): Promise<Uint8Array> {
  assertLength(secretKey, SECRET_KEY_LENGTH, "Ed25519 secret key");
  const signature = await ed25519.signAsync(concat(domain, payload), secretKey);
  assertLength(signature, SIGNATURE_LENGTH, "Ed25519 signature");
  return signature;
}

/**
 * Vérifie une signature Ed25519 sur `domain || payload`.
 *
 * Miroir exact de `sango_crypto::verify_native(...)`.
 *
 * Retourne `true` si valide, `false` sinon (ne lance pas — pratique pour
 * les composants UI qui affichent un badge « vérifiée / invalide »).
 */
export async function verifyNative(
  publicKey: Uint8Array,
  domain: Uint8Array,
  payload: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  if (publicKey.length !== PUBLIC_KEY_LENGTH) return false;
  if (signature.length !== SIGNATURE_LENGTH) return false;
  try {
    return await ed25519.verifyAsync(signature, concat(domain, payload), publicKey);
  } catch {
    return false;
  }
}

// --- Raccourcis par domaine -----------------------------------------------

export async function signTransactionPayload(
  secretKey: Uint8Array,
  unsignedBytes: Uint8Array,
): Promise<Uint8Array> {
  return signNative(secretKey, DOMAINS.TX_V1, unsignedBytes);
}

export async function verifyTransactionSignature(
  publicKey: Uint8Array,
  unsignedBytes: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  return verifyNative(publicKey, DOMAINS.TX_V1, unsignedBytes, signature);
}

export async function signProposalPayload(
  secretKey: Uint8Array,
  unsignedBytes: Uint8Array,
): Promise<Uint8Array> {
  return signNative(secretKey, DOMAINS.PROPOSAL_V1, unsignedBytes);
}

export async function signPrevotePayload(
  secretKey: Uint8Array,
  unsignedBytes: Uint8Array,
): Promise<Uint8Array> {
  return signNative(secretKey, DOMAINS.PREVOTE_V1, unsignedBytes);
}

export async function signPrecommitPayload(
  secretKey: Uint8Array,
  unsignedBytes: Uint8Array,
): Promise<Uint8Array> {
  return signNative(secretKey, DOMAINS.PRECOMMIT_V1, unsignedBytes);
}
