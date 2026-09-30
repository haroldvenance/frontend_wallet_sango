import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { UnsignedTransaction } from "../types/tx";

/**
 * Paramètres d'une opération wallet.
 *
 * **D-SESS-10** — Union discriminée keyed on `kind`.
 *
 * Le `kind` décrit **l'intention wallet** (transfer, bond, delegate…),
 * pas un type backend. Le mapping vers le `txKind` SANGO concret (et
 * son payload) est la responsabilité du `TransactionBuilder` de chaque
 * famille :
 *
 *     SendParams.kind
 *           ↓
 *     SangoTransactionBuilder
 *           ↓
 *     txKind SANGO + payload
 *           ↓
 *     bytes
 *
 * **Aucune adresse source.** La source (`sender`) est passée par
 * `WalletSession.send(params, account)` en 2ᵉ argument au builder,
 * déjà résolue depuis l'`AccountRef`.
 *
 * **V0.2** — Tous les variants staking SANGO sont supportés (le
 * backend les construit déjà via `@sango/sdk`). Ajouter un variant à
 * cette union **exige** d'ajouter le `case` correspondant dans
 * `SangoTransactionBuilder#encodeParams` (exhaustive check).
 */
export type SendParams =
  // --- Transfert natif ---
  | {
      readonly kind: "transfer";
      readonly to: Address;
      readonly assetRef: AssetRef;
      readonly amount: bigint;
      readonly memo?: Uint8Array;
    }
  // --- Staking : self-stake ---
  | {
      readonly kind: "bond";
      readonly assetRef: AssetRef;
      readonly amount: bigint;
    }
  | {
      readonly kind: "unbond";
      readonly assetRef: AssetRef;
      readonly amount: bigint;
    }
  // --- Staking : délégation ---
  | {
      readonly kind: "delegate";
      readonly validator: Address;
      readonly assetRef: AssetRef;
      readonly amount: bigint;
    }
  | {
      readonly kind: "undelegate";
      readonly validator: Address;
      readonly assetRef: AssetRef;
      readonly amount: bigint;
    }
  | {
      readonly kind: "claimRewards";
      readonly validator: Address;
      readonly assetRef: AssetRef;
    }
  // --- Staking : validateur ---
  | {
      readonly kind: "registerValidator";
      /** 0..1000 (basis points ; 700 = 7 %). */
      readonly commissionBps: number;
      /** Self-stake initial (base units). ≥ 100 000 SANGO. */
      readonly selfStake: bigint;
      readonly assetRef: AssetRef;
    }
  | {
      readonly kind: "updateCommission";
      /** 0..1000 (basis points). Prend effet après 7 jours. */
      readonly newCommissionBps: number;
      readonly assetRef: AssetRef;
    }
  | {
      readonly kind: "unjail";
      readonly assetRef: AssetRef;
    };

/**
 * Capacité optionnelle : construire une transaction non signée.
 *
 * @param params  L'intention wallet à encoder.
 * @param sender  Adresse source (hex `0x…` ou bech32m), résolue par la
 *                session via `AddressProvider.deriveAddress(account)`.
 *                Le builder ne reçoit jamais l'`AccountRef`.
 */
export interface TransactionBuilder {
  build(params: SendParams, sender: Address): Promise<UnsignedTransaction>;
}
