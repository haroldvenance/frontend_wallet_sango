/**
 * Adresse blockchain, sérialisée en string.
 *
 * **D-SESS-12** — Brand `\`0x${string}\`` (template literal).
 *
 * Choix V0.3 : Option A (template literal), le plus simple qui élimine
 * la divergence avec `@sango/types.AddressHex`. La sémantique multi-
 * chaîne est préservée par la documentation, pas par un brand opaque :
 * chaque `AddressProvider` sait interpréter le format de sa famille.
 *
 * Formats par famille (V0.3 : SANGO seulement) :
 * - SANGO : hex `0x…` (20 bytes)
 * - EVM   : hex `0x…` (20 bytes)     [E1]
 * - BTC   : bech32 SegWit (`bc1…`)   [E2+]
 * - SOL   : base58                    [E2+]
 *
 * Le brand `\`0x${string}\`` accepte les cas SANGO et EVM aujourd'hui.
 * Quand BTC/SOL arriveront, on remplacera cet alias par une union
 * branded (`HexAddress | Bech32mAddress | Base58Address`) — un seul
 * fichier à modifier.
 *
 * La validation du format effectif reste la responsabilité de
 * `AddressProvider.validateAddress()` (spec par famille).
 */
export type Address = `0x${string}`;

/**
 * Construit une `Address` depuis un corps hexadécimal **sans** préfixe
 * `0x`.
 *
 * Utilisé dans les fixtures de test et les helpers, pour éviter les
 * casts `as Address` répétés :
 *
 *   const TO = asAddress("bb".repeat(20));   // → "0xbbbb…"
 *
 * Aucune validation runtime — c'est un utilitaire de construction de
 * littéral typé. La validation de longueur (20 bytes) est faite par
 * les providers (`assertAddress`).
 */
/**
 * Clé publique, sérialisée en hex `0x…`.
 *
 * Brand identique à `Address` (`\`0x${string}\`), mais nommé
 * séparément pour la lisibilité sémantique. Aligné sur
 * `@sango/types.PublicKeyHex`.
 *
 * En V0.3 : Ed25519 (32 bytes). En E1 : secp256k1 (33 bytes compressed
 * ou 65 bytes uncompressed selon le format).
 */
export type PublicKey = `0x${string}`;

/**
 * Hash, sérialisé en hex `0x…`.
 *
 * Brand identique à `Address`/`PublicKey` (\`0x${string}\`), mais nommé
 * séparément pour la lisibilité sémantique. Utilisé pour les hashes de
 * tx, blocs, chainId, signatures, data.
 */
export type Hash = `0x${string}`;

export function asHash(body: string): Hash {
  return `0x${body}`;
}

export function asPublicKey(body: string): PublicKey {
  return `0x${body}`;
}

export function asAddress(body: string): Address {
  return `0x${body}`;
}
