import type { AddressHex, ChainIdHex, Hex, PublicKeyHex } from "@sango/types";

export type { Hex } from "@sango/types";

/** Retour de `sango_chainInfo`. */
export interface ChainInfo {
  readonly chainId: ChainIdHex;
  readonly height: number | null;
  readonly validatorCount: number;
  readonly protocolVersion: number;
}

/** Retour de `sango_getAccount`. */
export interface Account {
  readonly address: AddressHex;
  readonly publicKey: PublicKeyHex | null;
  readonly balance: string;
  readonly nonce: number;
}

/**
 * Transaction enrichie, telle que retournée par le RPC (P3.2.c).
 *
 * ⚠️ Aligné sur le format annoncé par le backend. Tant que P3.2.c n'est
 *    pas livré, seuls `hash` et `tx` (brut) sont garantis.
 */
export interface Tx {
  /** Hash de la transaction (32 bytes hex). */
  readonly hash: Hex;
  /** Hauteur du bloc contenant la tx, ou null si en mempool. */
  readonly blockHeight: number | null;
  /** Hash du bloc contenant la tx, ou null si en mempool. */
  readonly blockHash: Hex | null;
  /** Index de la tx dans le bloc. */
  readonly txIndex: number | null;
  /** Version du format. */
  readonly version: number;
  /** ChainId32 natif (32 bytes hex). */
  readonly chainId: Hex;
  /** Nonce de l'émetteur. */
  readonly nonce: number;
  /** Adresse native de l'émetteur (20 bytes hex). */
  readonly sender: Hex;
  /** Clé publique Ed25519 (32 bytes hex) ou null (bootstrap non fait). */
  readonly publicKey: Hex | null;
  /** Limite de gas. */
  readonly gasLimit: number;
  /** Max fee (base units par gas), string décimale. */
  readonly maxFee: string;
  /** Priority fee (base units par gas), string décimale. */
  readonly priorityFee: string;
  /** Montant transféré (base units), string décimale. */
  readonly value: string;
  /** Tag TxKind (`0x01`..`0x0B`). */
  readonly txKind: number;
  /** Destinataire (20 bytes hex) ou null. */
  readonly recipient: Hex | null;
  /** Data brute (`0x…`). */
  readonly data: Hex;
  /** Signature Ed25519 (64 bytes hex). */
  readonly signature: Hex;
  /** Succès de l'exécution (receipt). */
  readonly success: boolean;
  /** Gas consommé. */
  readonly gasUsed: number;
}

/**
 * Page de transactions, format paginé renvoyé par
 * `sango_getTransactionsByAddress`.
 */
export interface TxPage {
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly items: readonly Tx[];
}

/** Options du client RPC. */
export interface SangoRpcClientOptions {
  /** Timeout HTTP par requête, ms (défaut : 10 000). */
  readonly timeoutMs?: number;
  /** `fetch` custom (tests, polyfills). Défaut : `globalThis.fetch`. */
  readonly fetch?: typeof fetch;
  /** En-têtes HTTP additionnels. */
  readonly headers?: Record<string, string>;
}
