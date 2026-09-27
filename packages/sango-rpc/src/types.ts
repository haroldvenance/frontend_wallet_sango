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
  /** Type : `native` (Ed25519) ou `evm` (secp256k1). */
  readonly kind: "native" | "evm";
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

/**
 * Item de transaction **brut** tel que renvoyé par le RPC.
 *
 * Le champ `tx` est l'encodage canonique complet (hex). On le décode
 * via `decodeTransaction` (wallet-core) puis on fusionne avec les
 * métadonnées (`hash`, `blockHeight`, `blockHash`, `txIndex`, `kind`)
 * pour produire un `Tx` enrichi.
 */
export interface RawTxItem {
  readonly hash: Hex;
  readonly blockHeight: number | null;
  readonly blockHash: Hex | null;
  readonly txIndex: number | null;
  readonly kind: "native" | "evm";
  readonly txKind: number | null;
  /** Transaction encodée (hex, `0x…`). */
  readonly tx: Hex;
}

/** Page de transactions brutes. */
export interface RawTxPage {
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly items: readonly RawTxItem[];
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


// --- Validators & staking (P3.2.c enrichi) ---------------------------------

/**
 * Informations d'un validateur (miroir de `ValidatorInfo` côté Rust).
 *
 * ⚠️ Tous les montants sont en **base units** (string décimale u128).
 *    Diviser par 10⁷ pour l'affichage SANGO.
 */
export interface ValidatorInfo {
  readonly address: AddressHex;
  readonly publicKey: PublicKeyHex;
  /** Self-stake bonded (base units, string). */
  readonly selfStake: string;
  /** Total des délégations reçues (base units, string). */
  readonly totalDelegated: string;
  /** Puissance de vote = selfStake + totalDelegated (base units, string). */
  readonly votingPower: string;
  /** Commission courante en basis points (700 = 7 %). */
  readonly commissionBps: number;
  readonly jailed: boolean;
  /** Commission en attente (null si aucune). */
  readonly pendingCommissionBps: number | null;
  /** Timestamp Unix d'application de la commission en attente. */
  readonly pendingCommissionAt: number | null;
  /** Timestamp Unix de sortie de jail (null si non jailed). */
  readonly jailedUntil: number | null;
  /** Hauteur du début de la fenêtre de downtime courante. */
  readonly downtimeWindowStart: number;
  /** Blocs manqués dans la fenêtre courante. */
  readonly downtimeMissed: number;
}

/**
 * Délégation d'un compte vers un validateur.
 *
 * ⚠️ Montants en base units (string décimale).
 */
export interface Delegation {
  readonly delegator: AddressHex;
  readonly validator: AddressHex;
  /** Montant bonded (base units, string). */
  readonly bonded: string;
  /** Montant en cours d'unbonding (base units, string). */
  readonly unbonding: string;
  /** Timestamp Unix du plus tardif des unbondings en cours (null si aucun). */
  readonly unbondingUntil: number | null;
  /** Récompenses non réclamées (base units, string). */
  readonly pendingRewards: string;
}

/**
 * Événement d'unbonding en attente de maturation.
 */
export interface PendingUnbonding {
  readonly id: number;
  readonly delegator: AddressHex;
  readonly validator: AddressHex;
  /** Montant à libérer (base units, string). */
  readonly amount: string;
  /** Timestamp Unix de maturité. */
  readonly matureAt: number;
}

// --- EVM blocks (namespace eth_*) ------------------------------------------

/**
 * Bloc EVM, format EIP-1474 (simplifié).
 *
 * ⚠️ `transactions` ne contient que les txs EVM. Un bloc 100% natif
 *    retourne `[]`.
 */
export interface EvmBlock {
  readonly number: Hex;
  readonly hash: Hex;
  readonly parentHash: Hex;
  readonly timestamp: Hex;
  readonly gasLimit: Hex;
  readonly gasUsed: Hex;
  readonly baseFeePerGas?: Hex;
  readonly miner: Hex;
  readonly transactions: readonly Hex[];
  readonly transactionsRoot: Hex;
  readonly stateRoot: Hex;
  readonly receiptsRoot: Hex;
}
