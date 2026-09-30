import type { ChainFamily } from "./chain";
import type { AssetRef } from "./asset";

/**
 * Metadata lisible attachée à une transaction en cours de construction.
 *
 * **D-SESS-10** — `to` et `amount` sont optionnels car tous les
 * variants de `SendParams` n'ont pas de destinataire ni de montant :
 *
 * | kind              | to         | amount   |
 * |-------------------|------------|----------|
 * | transfer          | requis     | requis   |
 * | bond / unbond     | (absent)   | requis   |
 * | delegate          | validator  | requis   |
 * | undelegate        | validator  | requis   |
 * | claimRewards      | validator  | 0n       |
 * | registerValidator | (absent)   | selfStake|
 * | updateCommission  | (absent)   | 0n       |
 * | unjail            | (absent)   | 0n       |
 *
 * Le `payload` opérationnel vit dans `UnsignedTransaction.payload` —
 * `TxMeta` n'est qu'une projection lisible pour l'UI.
 */
export interface TxMeta {
  readonly from: string;
  readonly to?: string;
  readonly assetRef: AssetRef;
  readonly amount?: bigint;
}

/**
 * Transaction non signée.
 *
 * `payload` est **opaque** au-dessus de l'adaptateur : c'est le builder
 * de chaîne qui produit cette valeur, et le signer de chaîne qui la
 * consomme. Aucune autre couche ne doit l'inspecter.
 */
export interface UnsignedTransaction {
  readonly family: ChainFamily;
  readonly networkId: string;
  readonly payload: unknown;
  readonly meta: TxMeta;
}

export interface SignedTransaction {
  readonly unsigned: UnsignedTransaction;
  /** Bytes canoniques à envoyer au réseau. */
  readonly raw: Uint8Array;
  /** Hash canonique de la tx, format chaîne. */
  readonly txHash: string;
}
