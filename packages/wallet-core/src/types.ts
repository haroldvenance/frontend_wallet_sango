/**
 * Réseau Sango.
 *
 * - `mainnet` → HRP Bech32m `sango`
 * - `testnet` → HRP Bech32m `tsango` (partagé avec devnet, spec §2.1)
 */
export type Network = "mainnet" | "testnet";

/**
 * Paire de clés Ed25519 native Sango.
 *
 * `secretKey` est le **seed Ed25519** de 32 bytes (pas la clé étendue).
 * Miroir de `sango_crypto::NativeKeypair`.
 */
export interface Ed25519Keypair {
  /** Clé publique Ed25519 (32 bytes). */
  readonly publicKey: Uint8Array;
  /** Seed Ed25519 (32 bytes). */
  readonly secretKey: Uint8Array;
}

/**
 * Chaîne hexadécimale préfixée `0x`.
 */
export type Hex = `0x${string}`;
