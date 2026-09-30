import type { Address } from "../types/address";
import type {
  Delegation,
  PendingUnbonding,
  ValidatorInfo,
} from "../types/staking";

/**
 * Capacité optionnelle : lecture des données de staking.
 *
 * **V0.2** — Absente des chaînes sans notion de validateur (BTC, SOL
 * en V0). Les adaptateurs qui l'exposent (SANGO) fournissent les
 * quatre lectures en un seul point.
 *
 * Les écritures (bond, delegate, claim…) passent par
 * `TransactionBuilder` + `session.send()` (D-SESS-10) — cette capacité
 * est strictement en lecture.
 */
export interface StakingProvider {
  /** Liste complète des validateurs enregistrés (tableau vide si aucun). */
  listValidators(): Promise<readonly ValidatorInfo[]>;

  /** Info d'un validateur précis, ou `null` s'il n'est pas enregistré. */
  getValidatorInfo(validator: Address): Promise<ValidatorInfo | null>;

  /** Délégations émises **par** une adresse (délégateur). */
  getDelegations(delegator: Address): Promise<readonly Delegation[]>;

  /** Événements d'unbonding en attente pour une adresse. */
  getPendingUnbondings(
    delegator: Address,
  ): Promise<readonly PendingUnbonding[]>;
}
