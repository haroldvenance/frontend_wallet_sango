import { sha512 } from "@noble/hashes/sha2.js";

/**
 * SLIP-0010 — dérivation hiérarchique pour Ed25519.
 *
 * Implémentation **strictement conforme** :
 * https://github.com/satoshilabs/slips/blob/master/slip-0010.md
 *
 * **Contraintes Ed25519** :
 *   - **tous les niveaux sont durcis** (pas de dérivation non-durcie) ;
 *   - Ed25519 dérive la clé publique hors SLIP-0010.
 *
 * **HMAC-SHA512 manuel (RFC 2104)** : l'implémentation utilise
 * `sha512` brut + construction ipad/opad explicite. On évite ainsi
 * toute dépendance à `@noble/hashes/hmac`, dont l'état interne partagé
 * produisait des valeurs divergentes sur les dérivations successives
 * (bug observé en 5.1 : m/0' OK, m/0'/1' faux).
 *
 * **Contrat interopérable** (docs/design/hd-derivation.md §3.1) : le
 * vecteur officiel SLIP-0010 doit passer **bit à bit**.
 */

export interface Slip10Node {
  readonly privateKey: Uint8Array;
  readonly chainCode: Uint8Array;
}

const HARDENED_OFFSET = 0x80000000;
const PRIVATE_KEY_LENGTH = 32;
const CHAIN_CODE_LENGTH = 32;
const SHA512_BLOCK_SIZE = 128;

const ED25519_SEED_KEY = new TextEncoder().encode("ed25519 seed");

// ── HMAC-SHA512 (RFC 2104) ──────────────────────────────────

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * HMAC-SHA512(key, message) — construction RFC 2104 explicite.
 *
 *     K' = key.length > BLOCK_SIZE ? SHA512(key) : key
 *     K' = K' || 0x00 * (BLOCK_SIZE - K'.length)
 *     ipad = 0x36 * BLOCK_SIZE
 *     opad = 0x5c * BLOCK_SIZE
 *     HMAC = SHA512((K' ⊕ opad) || SHA512((K' ⊕ ipad) || message))
 *
 * BLOCK_SIZE = 128 pour SHA-512.
 */
function hmacSha512(key: Uint8Array, message: Uint8Array): Uint8Array {
  // 1. Normalise la clé à BLOCK_SIZE bytes.
  let k: Uint8Array;
  if (key.length > SHA512_BLOCK_SIZE) {
    k = sha512(key);
  } else {
    k = new Uint8Array(SHA512_BLOCK_SIZE);
    k.set(key);
  }
  // SHA512(key) renvoie 64 bytes ; on pad à 128.
  if (k.length < SHA512_BLOCK_SIZE) {
    const padded = new Uint8Array(SHA512_BLOCK_SIZE);
    padded.set(k);
    k = padded;
  }

  // 2. ipad / opad.
  const ipad = new Uint8Array(SHA512_BLOCK_SIZE);
  const opad = new Uint8Array(SHA512_BLOCK_SIZE);
  for (let i = 0; i < SHA512_BLOCK_SIZE; i += 1) {
    ipad[i] = (k[i]! ^ 0x36) & 0xff;
    opad[i] = (k[i]! ^ 0x5c) & 0xff;
  }

  // 3. HMAC.
  const inner = sha512(concat(ipad, message));
  return sha512(concat(opad, inner));
}

// ── SLIP-0010 ───────────────────────────────────────────────

export function slip10Master(seed: Uint8Array): Slip10Node {
  if (seed.length < 16 || seed.length > 64) {
    throw new Error(
      `SLIP-0010: seed must be 16..64 bytes, got ${seed.length}`,
    );
  }
  const I = hmacSha512(ED25519_SEED_KEY, seed);
  return {
    privateKey: I.slice(0, PRIVATE_KEY_LENGTH),
    chainCode: I.slice(
      PRIVATE_KEY_LENGTH,
      PRIVATE_KEY_LENGTH + CHAIN_CODE_LENGTH,
    ),
  };
}

export function slip10DeriveChildHardened(
  parent: Slip10Node,
  index: number,
): Slip10Node {
  if (!Number.isInteger(index) || index < 0 || index >= HARDENED_OFFSET) {
    throw new Error(
      `SLIP-0010: hardened index must be in 0..2^31-1, got ${index}`,
    );
  }
  // data = 0x00 || parent.privateKey || ser32_be(index + 2^31)
  const data = new Uint8Array(1 + PRIVATE_KEY_LENGTH + 4);
  data[0] = 0x00;
  data.set(parent.privateKey, 1);
  const hardened = index + HARDENED_OFFSET;
  data[33] = (hardened >>> 24) & 0xff;
  data[34] = (hardened >>> 16) & 0xff;
  data[35] = (hardened >>> 8) & 0xff;
  data[36] = hardened & 0xff;
  const I = hmacSha512(parent.chainCode, data);
  return {
    privateKey: I.slice(0, PRIVATE_KEY_LENGTH),
    chainCode: I.slice(
      PRIVATE_KEY_LENGTH,
      PRIVATE_KEY_LENGTH + CHAIN_CODE_LENGTH,
    ),
  };
}

export function slip10DerivePath(
  seed: Uint8Array,
  indices: readonly number[],
): Slip10Node {
  let node = slip10Master(seed);
  for (const index of indices) {
    node = slip10DeriveChildHardened(node, index);
  }
  return node;
}
