/**
 * Types partagés entre tous les packages Sango frontend.
 */

/**
 * Chaîne hexadécimale préfixée `0x`.
 */
export type Hex = `0x${string}`;

/**
 * Réseau Sango.
 *
 * - `mainnet` → HRP Bech32m `sango`
 * - `testnet` → HRP Bech32m `tsango` (partagé avec devnet, spec §2.1)
 */
export type Network = "mainnet" | "testnet";

/** Adresse native (20 bytes hex). */
export type AddressHex = Hex;

/** Clé publique Ed25519 (32 bytes hex). */
export type PublicKeyHex = Hex;

/** Hash de transaction (32 bytes hex). */
export type TxHashHex = Hex;

/** ChainId32 natif (32 bytes hex). */
export type ChainIdHex = Hex;
