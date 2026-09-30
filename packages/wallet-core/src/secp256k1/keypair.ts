import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";

const PRIVATE_KEY_LENGTH = 32;
const COMPRESSED_PUBLIC_KEY_LENGTH = 33;
const UNCOMPRESSED_PUBLIC_KEY_LENGTH = 65;
const SIGNATURE_COMPACT_LENGTH = 64;
const ETH_ADDRESS_LENGTH = 20;

/**
 * Paire de clés secp256k1 (courbe utilisée par Ethereum/Bitcoin).
 *
 * ⚠️ Distinct d'`Ed25519Keypair` (courbe SANGO). Les deux cohabitent
 *    dans `wallet-core` sans se mélanger — voir D-SIGNER-1.
 */
export interface Secp256k1Keypair {
  readonly privateKey: Uint8Array;
  readonly publicKeyCompressed: Uint8Array;
  readonly publicKeyUncompressed: Uint8Array;
}

function assertLength(v: Uint8Array, expected: number, name: string): void {
  if (v.length !== expected) {
    throw new Error(`${name} must be exactly ${expected} bytes, got ${v.length}`);
  }
}

export function secp256k1KeypairFromPrivateKey(
  privateKey: Uint8Array,
): Secp256k1Keypair {
  assertLength(privateKey, PRIVATE_KEY_LENGTH, "secp256k1 private key");

  const sk = new Uint8Array(privateKey);
  const publicKeyCompressed = secp256k1.getPublicKey(sk, true);
  const publicKeyUncompressed = secp256k1.getPublicKey(sk, false);

  assertLength(publicKeyCompressed, COMPRESSED_PUBLIC_KEY_LENGTH, "compressed public key");
  assertLength(publicKeyUncompressed, UNCOMPRESSED_PUBLIC_KEY_LENGTH, "uncompressed public key");

  return { privateKey: sk, publicKeyCompressed, publicKeyUncompressed };
}

/**
 * Signe un digest de 32 bytes. Signature compacte (r || s), 64 bytes,
 * déterministe (RFC 6979).
 */
export function secp256k1SignDigest(
  keypair: Secp256k1Keypair,
  digest: Uint8Array,
): Uint8Array {
  assertLength(digest, 32, "digest");
  // ⚠️ `prehash: false` est CRITIQUE : par défaut noble v2 pré-hashe
  //    le message avec sha256. Pour EVM, on signe un digest keccak256
  //    déjà calculé (hash de la tx EIP-1559) — il ne faut PAS re-hasher.
  const compact = secp256k1.sign(digest, keypair.privateKey, {
    prehash: false,
  });
  if (!(compact instanceof Uint8Array)) {
    throw new Error(
      "secp256k1.sign() did not return a Uint8Array — API noble incompatible",
    );
  }
  assertLength(compact, SIGNATURE_COMPACT_LENGTH, "compact signature");
  return compact;
}

export function secp256k1SignMessage(
  keypair: Secp256k1Keypair,
  message: Uint8Array,
): Uint8Array {
  return secp256k1SignDigest(keypair, keccak_256(message));
}

/**
 * Signature secp256k1 **recoverable** — utile pour Ethereum (EIP-1559
 * yParity 0 | 1) et Bitcoin (v 27..34).
 *
 * Retourne la signature compacte (r || s, 64 bytes) + le recovery bit.
 * Le format de sortie ne présume pas du protocole (EVM veut yParity,
 * BTC veut 27+recovery) — c'est au caller de mapper.
 */
export interface RecoverableSignature {
  readonly compact: Uint8Array;
  readonly recovery: 0 | 1;
}

/**
 * Signe un digest de 32 bytes et calcule le recovery bit.
 *
 * noble v2 expose nativement `format: "recovered"` qui produit une
 * signature 65 bytes (r || s || recovery). On en extrait le recovery
 * bit et on normalise la forme : `{ compact: 64 bytes, recovery }`.
 *
 * Le recovery bit est garanti ∈ {0, 1} — c'est ce qu'EIP-1559 attend
 * pour yParity.
 */
export function secp256k1SignDigestRecoverable(
  keypair: Secp256k1Keypair,
  digest: Uint8Array,
): RecoverableSignature {
  assertLength(digest, 32, "digest");

  const sig = secp256k1.sign(digest, keypair.privateKey, {
    prehash: false,
    format: "recovered",
  });

  if (!(sig instanceof Uint8Array) || sig.length !== 65) {
    throw new Error(
      "secp256k1SignDigestRecoverable: expected 65-byte recovered signature, " +
        `got ${sig instanceof Uint8Array ? `${sig.length} bytes` : typeof sig}`,
    );
  }

  // noble v2 place le recovery bit en PREMIER byte (convention Bitcoin
  // compact signature). Structure : [recovery, r(32), s(32)].
  const recoveryByte = sig[0]!;
  if (recoveryByte !== 0 && recoveryByte !== 1) {
    throw new Error(
      `secp256k1SignDigestRecoverable: unexpected recovery byte ${recoveryByte} (expected 0 or 1)`,
    );
  }

  const compact = sig.slice(1);
  assertLength(compact, SIGNATURE_COMPACT_LENGTH, "compact signature");

  return { compact, recovery: recoveryByte as 0 | 1 };
}

export function secp256k1Verify(
  publicKey: Uint8Array,
  digest: Uint8Array,
  signature: Uint8Array,
): boolean {
  assertLength(digest, 32, "digest");
  assertLength(signature, SIGNATURE_COMPACT_LENGTH, "compact signature");
  try {
    // ⚠️ `prehash: false` obligatoire : le digest est déjà haché.
    return secp256k1.verify(signature, digest, publicKey, {
      prehash: false,
    });
  } catch {
    return false;
  }
}

/**
 * Dérive l'adresse Ethereum (20 bytes) depuis une clé publique
 * non-compressée (65 bytes, préfixe 0x04).
 * Formule : `keccak256(pubkey[1..65])[12..32]`.
 */
export function deriveEthereumAddress(publicKeyUncompressed: Uint8Array): Uint8Array {
  assertLength(
    publicKeyUncompressed,
    UNCOMPRESSED_PUBLIC_KEY_LENGTH,
    "uncompressed public key",
  );
  if (publicKeyUncompressed[0] !== 0x04) {
    throw new Error("Uncompressed public key must start with 0x04");
  }
  const raw = publicKeyUncompressed.slice(1);
  const hash = keccak_256(raw);
  const address = hash.slice(12);
  assertLength(address, ETH_ADDRESS_LENGTH, "Ethereum address");
  return address;
}
