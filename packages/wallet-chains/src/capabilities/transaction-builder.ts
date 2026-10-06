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
 *
 * **E1.6** — `transferErc20` ajouté pour les tokens ERC-20 (USDC,
 * USDT). Le variant porte `assetRef: { kind: "token", … }` et un
 * `amount` en base units du token. L'encodage ABI `transfer(address,
 * uint256)` est fait par l'adaptateur EVM.
 *
 * **E2.2.a.2** — `approveErc20` ajouté pour la gestion des allowances
 * ERC-20. Encode `approve(address, uint256)` côté EVM ; rejeté
 * explicitement par `SangoTransactionBuilder`. Le variant ne
 * transfère aucun token : il autorise un `spender` à dépenser les
 * tokens de l'owner.
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
  // --- EVM : ERC-20 transfer ---
  | {
      readonly kind: "transferErc20";
      /** Adresse du destinataire (pas du contrat). */
      readonly to: Address;
      /**
       * AssetRef de type `token` — `contract` = adresse du contrat
       * ERC-20, `networkId` = réseau cible.
       */
      readonly assetRef: AssetRef;
      /** Montant en base units du token (voir `decimals` du token). */
      readonly amount: bigint;
    }
  // --- EVM : ERC-20 approve (E2.2.a.2) ---
  | {
      readonly kind: "approveErc20";
      /**
       * Adresse du contrat ERC-20 dont on modifie l'allowance.
       *
       * Doit être **identique** à `assetRef.contract`. Le builder
       * rejette explicitement toute divergence (défense contre un
       * désynchro appelant).
       */
      readonly token: Address;
      /** Adresse autorisée à dépenser les tokens de l'owner. */
      readonly spender: Address;
      /**
       * Montant autorisé (base units du token).
       *
       * - `0n` → révocation (retire l'autorisation)
       * - `MAX_UINT256` → autorisation illimitée (convention
       *   Uniswap / PancakeSwap)
       * - autre → montant exact
       *
       * Le builder valide `0n <= amount <= MAX_UINT256` avant
       * l'encodage ABI (`uint256`).
       */
      readonly amount: bigint;
      /**
       * AssetRef du token approuvé (`kind: "token"`).
       *
       * ⚠️ Ce n'est **pas** l'asset de paiement des frais — le gas
       *    reste toujours payé dans `network.nativeAsset` (D-E1.7-2).
       */
      readonly assetRef: AssetRef;
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
