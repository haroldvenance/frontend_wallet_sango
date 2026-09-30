import type { Address } from "./address";

/**
 * Informations d'un validateur.
 *
 * **Miroir exact** de `@sango/rpc` types.ValidatorInfo — la compat
 * structurelle est vérifiée par `sango/__tests__/rpc-compat.test.ts`.
 *
 * ⚠️ Tous les montants sont en **base units** (string décimale u128).
 *    Diviser par 10⁷ pour l'affichage SANGO.
 */
export interface ValidatorInfo {
  readonly address: Address;
  readonly publicKey: string;
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
  readonly delegator: Address;
  readonly validator: Address;
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
  readonly delegator: Address;
  readonly validator: Address;
  /** Montant à libérer (base units, string). */
  readonly amount: string;
  /** Timestamp Unix de maturité. */
  readonly matureAt: number;
}
