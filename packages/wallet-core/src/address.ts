import { keccak_256 } from "@noble/hashes/sha3.js";
import { bech32m } from "@scure/base";

const ADDRESS_DOMAIN = new TextEncoder().encode("SANGO/ADDRESS/V1");

const PUBLIC_KEY_LENGTH = 32;
const ADDRESS_LENGTH = 20;

/**
 * Vérifie la taille d'une clé publique Ed25519.
 */
function assertPublicKey(publicKey: Uint8Array): void {
  if (publicKey.length !== PUBLIC_KEY_LENGTH) {
    throw new Error(
      `Ed25519 public key must be exactly ${PUBLIC_KEY_LENGTH} bytes, got ${publicKey.length}`,
    );
  }
}

/**
 * Vérifie la taille d'une adresse native brute.
 */
function assertAddress(address: Uint8Array): void {
  if (address.length !== ADDRESS_LENGTH) {
    throw new Error(
      `Native address must be exactly ${ADDRESS_LENGTH} bytes, got ${address.length}`,
    );
  }
}

/**
 * Dérive l'adresse native Sango depuis une clé publique Ed25519.
 *
 * Formule normative Rust :
 *
 *   Keccak256("SANGO/ADDRESS/V1" || public_key)[0..20]
 *
 * Bech32m n'intervient PAS dans cette fonction.
 */
export function deriveNativeAddress(publicKey: Uint8Array): Uint8Array {
  assertPublicKey(publicKey);

  const payload = new Uint8Array(ADDRESS_DOMAIN.length + publicKey.length);

  payload.set(ADDRESS_DOMAIN, 0);
  payload.set(publicKey, ADDRESS_DOMAIN.length);

  const hash = keccak_256(payload);

  return hash.slice(0, ADDRESS_LENGTH);
}

/**
 * Encode l'adresse native brute en hexadécimal.
 *
 * Format RPC :
 *   0x + 40 caractères hex.
 */
export function nativeAddressToHex(address: Uint8Array): string {
  assertAddress(address);

  return `0x${Array.from(address, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

/**
 * Encode une adresse native en Bech32m.
 *
 * - Mainnet         : sango1...
 * - Testnet / devnet: tsango1...  (HRP partagé, spec §2.1)
 *
 * Variante Bech32m (BIP-350), payload = toWords(address20), aucun préfixe,
 * aucun version byte. Voir docs/spec/bech32m-native-address.md.
 */
export function encodeNativeAddress(
  address: Uint8Array,
  network: "mainnet" | "testnet",
): string {
  assertAddress(address);

  const hrp = network === "mainnet" ? "sango" : "tsango";

  return bech32m.encode(hrp, bech32m.toWords(address));
}

/**
 * Décode une adresse native Bech32m et vérifie le réseau attendu.
 *
 * Rejette :
 *   - tout checksum non-Bech32m (y compris Bech32 classique) ;
 *   - tout HRP ≠ réseau attendu ;
 *   - toute adresse ≠ 20 bytes ;
 *   - toute forme non canonique (re-encode + compare, cf. spec §4).
 *
 * Mainnet : "sango"   Testnet / devnet : "tsango" (spec §2.1).
 */
export function decodeNativeAddress(
  encoded: string,
  expectedNetwork: "mainnet" | "testnet",
): Uint8Array {
  const expectedHrp = expectedNetwork === "mainnet" ? "sango" : "tsango";

  // 1. Décodage Bech32m strict (rejette tout checksum ≠ 0x2bc830a3).
  let decoded: { prefix: string; words: number[] };
  try {
    decoded = bech32m.decode(encoded as `${string}1${string}`);
  } catch (cause) {
    throw new Error(
      `Invalid Bech32m string: ${(cause as Error).message}`,
    );
  }

  // 2. HRP attendu.
  if (decoded.prefix !== expectedHrp) {
    throw new Error(
      `Unexpected HRP: expected "${expectedHrp}", got "${decoded.prefix}"`,
    );
  }

  // 3. Conversion words → bytes.
  const address = bech32m.fromWords(decoded.words);

  // 4. Longueur exacte.
  if (address.length !== ADDRESS_LENGTH) {
    throw new Error(
      `Native address must be exactly ${ADDRESS_LENGTH} bytes, got ${address.length}`,
    );
  }

  // 5. Re-encode + compare (parité avec decode_checked_bech32m côté Rust).
  //    @scure/base a des décodeurs séparés (pas d'auto-détection), donc
  //    l'étape 1 rejette déjà Bech32 classique. Ce contrôle reste utile
  //    comme garde-fou contre une non-canonicalité future (uppercase, padding).
  const reencoded = bech32m.encode(
    decoded.prefix,
    bech32m.toWords(address),
  );

  if (reencoded.toLowerCase() !== encoded.toLowerCase()) {
    throw new Error(
      "Non-canonical encoding: re-encoded form differs from input",
    );
  }

  return address;
}


/**
 * Décode une chaîne Bech32m **sans présumer** du réseau.
 *
 * Retourne `{ address, network }`.
 *
 * ⚠️ `devnet` n'est **pas** une valeur possible en sortie : devnet
 *    partage le HRP `tsango` avec testnet (spec §2.1). Un parseur ne
 *    peut pas distinguer les deux, et c'est voulu.
 *
 * Contrôles :
 *   - décode strict Bech32m (rejette Bech32 classique) ;
 *   - HRP ∈ { `sango`, `tsango` } ;
 *   - payload = 20 bytes exactement ;
 *   - re-encode + compare (lowercase) → rejette la non-canonicalité.
 */
export function tryDecodeAnyNetwork(
  s: string,
): { address: Uint8Array; network: "mainnet" | "testnet" } {
  let decoded: { prefix: string; words: number[] };
  try {
    decoded = bech32m.decode(s as `${string}1${string}`);
  } catch (cause) {
    throw new Error(`invalid Bech32m: ${(cause as Error).message}`);
  }

  const hrp = decoded.prefix;
  let network: "mainnet" | "testnet";
  switch (hrp) {
    case "sango":
      network = "mainnet";
      break;
    case "tsango":
      network = "testnet";
      break;
    default:
      throw new Error(`unknown HRP: ${hrp}`);
  }

  const address = bech32m.fromWords(decoded.words);
  if (address.length !== 20) {
    throw new Error(
      `invalid address length: expected 20, got ${address.length}`,
    );
  }

  // Canonicalité : re-encode + compare (aligné avec decode_checked_bech32m Rust).
  const canonical = bech32m.encode(hrp, bech32m.toWords(address));
  if (canonical !== s.toLowerCase()) {
    throw new Error(
      `non-canonical address: expected ${canonical}, got ${s.toLowerCase()}`,
    );
  }

  return { address, network };
}
