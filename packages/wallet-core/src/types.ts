export type { Hex, Network } from "@sango/types";

/**
 * Paire de clés Ed25519 native Sango.
 *
 * `secretKey` est le **seed Ed25519** de 32 bytes (pas la clé étendue).
 */
export interface Ed25519Keypair {
  readonly publicKey: Uint8Array;
  readonly secretKey: Uint8Array;
}
