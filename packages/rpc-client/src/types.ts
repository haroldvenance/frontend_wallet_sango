/**
 * Chaîne hexadécimale préfixée `0x`.
 */
export type Hex = `0x${string}`;

/**
 * Informations de chaîne.
 */
export interface ChainInfo {
  /** Chain ID natif (32 bytes, hex). */
  readonly chainId: Hex;
  /** Hauteur courante. */
  readonly height: number;
  /** Nombre de validateurs actifs. */
  readonly validatorCount: number;
  /** Version du protocole (V1 = 1). */
  readonly protocolVersion: number;
}

/**
 * Compte natif.
 *
 * ⚠️ `balance` est en **base units** (u128 en string décimale).
 *    Diviser par 10_000_000 pour l'affichage utilisateur.
 */
export interface Account {
  /** Adresse native (20 bytes, hex). */
  readonly address: Hex;
  /** Clé publique Ed25519 (32 bytes, hex) ou `null` si non enregistrée. */
  readonly publicKey: Hex | null;
  /** Balance en base units, string décimale (u128). */
  readonly balance: string;
  /** Nonce courant. */
  readonly nonce: number;
}

/**
 * Pointeur vers le dernier bloc appliqué.
 */
export interface ChainTip {
  /** Hauteur du dernier bloc. */
  readonly height: number;
  /** Hash du dernier bloc (32 bytes, hex). */
  readonly blockHash: Hex;
}

/**
 * Options du client RPC.
 */
export interface SangoRpcClientOptions {
  /** Timeout HTTP par requête, ms (défaut : 10 000). */
  readonly timeoutMs?: number;
  /** `fetch` custom (tests, polyfills). Défaut : `globalThis.fetch`. */
  readonly fetch?: typeof fetch;
  /** En-têtes HTTP additionnels. */
  readonly headers?: Record<string, string>;
}
