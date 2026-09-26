/**
 * Chaîne hexadécimale préfixée `0x`.
 */
export type Hex = `0x${string}`;

/**
 * Informations de chaîne.
 *
 * Retour de `sango_chainInfo`.
 *
 * ⚠️ `chainId` est le **ChainId32 natif** (32 bytes hex), pas le chain ID
 *    EVM (`u64`). Pour l'EVM, voir `eth_chainId` (autre module).
 *
 * ⚠️ `height` peut être `null` si aucun bloc n'a encore été appliqué.
 */
export interface ChainInfo {
  /** ChainId32 natif (32 bytes, hex, lowercase). */
  readonly chainId: Hex;
  /** Hauteur courante, ou `null` si aucun bloc. */
  readonly height: number | null;
  /** Nombre de validateurs actifs. */
  readonly validatorCount: number;
  /** Version du protocole (V1 = 1). */
  readonly protocolVersion: number;
}

/**
 * Compte natif, retour de `sango_getAccount`.
 *
 * ⚠️ `balance` est en **base units** (u128 en string décimale).
 *    Diviser par 10_000_000 pour l'affichage utilisateur.
 *
 * ⚠️ `nonce` est un **number JSON** (u64), pas une string.
 *
 * ⚠️ `publicKey` est `null` si le compte est « ghost » (crédité sans clé
 *    enregistrée). Sinon 32 bytes hex.
 */
export interface Account {
  /** Adresse native (20 bytes, hex lowercase). */
  readonly address: Hex;
  /** Clé publique Ed25519 (32 bytes hex) ou `null` si non enregistrée. */
  readonly publicKey: Hex | null;
  /** Balance en base units, string décimale (u128). */
  readonly balance: string;
  /** Nonce courant (u64). */
  readonly nonce: number;
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
