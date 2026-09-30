import type { Address, Hash, PublicKey } from "./address";

/**
 * Détail complet d'une transaction.
 *
 * **D-SESS-9** — Miroir strict de `@sango/rpc.Tx`. Ces champs sont
 * SANGO-spécifiques (txKind, gas, signature) et vivent dans une
 * capability dédiée, pas dans `HistoryItem` (vue universelle
 * account-centric).
 *
 * Utilisé par :
 *   - `/history/:hash` (transaction viewer)
 *   - `/history` (liste paginée via TxDetailPage)
 *   - `use-transactions.ts` (migration V0.3)
 *
 * La compat structurelle avec `@sango/rpc.Tx` est vérifiée par
 * `sango/__tests__/rpc-compat.test.ts`.
 */
export interface TxDetail {
  /** Hash de la transaction (32 bytes hex). */
  readonly hash: Hash;
  /** Type : `native` (Ed25519) ou `evm` (secp256k1). */
  readonly kind: "native" | "evm";
  /** Hauteur du bloc contenant la tx, ou null si en mempool. */
  readonly blockHeight: number | null;
  /** Hash du bloc contenant la tx, ou null si en mempool. */
  readonly blockHash: Hash | null;
  /** Index de la tx dans le bloc. */
  readonly txIndex: number | null;
  /** Version du format. */
  readonly version: number;
  /** ChainId32 natif (32 bytes hex). */
  readonly chainId: Hash;
  /** Nonce de l'émetteur. */
  readonly nonce: number;
  /** Adresse native de l'émetteur (20 bytes hex). */
  readonly sender: Address;
  /** Clé publique Ed25519 (32 bytes hex) ou null (bootstrap non fait). */
  readonly publicKey: PublicKey | null;
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
  readonly recipient: Address | null;
  /** Data brute (`0x…`). */
  readonly data: Hash;
  /** Signature Ed25519 (64 bytes hex). */
  readonly signature: Hash;
  /** Succès de l'exécution (receipt). */
  readonly success: boolean;
  /** Gas consommé. */
  readonly gasUsed: number;
}

/** Page de transactions détaillées, format paginé. */
export interface TxDetailPage {
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly items: readonly TxDetail[];
}
