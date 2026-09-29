import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { UnsignedTransaction } from "../types/tx";

/**
 * Paramètres d'un envoi natif.
 *
 * **Sémantique de `from` (D-SESS-8) :**
 *
 * - Appelé via `WalletSession.send(params, account)` : `from` peut
 *   être omis. La session dérive l'adresse depuis `account` et
 *   l'injecte dans le builder.
 * - Appelé directement via `TransactionBuilder.build(params)` : `from`
 *   est **requis**. Le builder lance une erreur explicite si absent.
 *
 * Cette dualité évite aux consommateurs de la session de devoir
 * connaître l'adresse source (responsabilité du `AccountRef`).
 */
export interface SendParams {
  readonly from?: Address;
  readonly to: Address;
  readonly assetRef: AssetRef;
  readonly amount: bigint;
  readonly memo?: Uint8Array;
}

/**
 * Capacité optionnelle : construire une transaction non signée.
 */
export interface TransactionBuilder {
  build(params: SendParams): Promise<UnsignedTransaction>;
}
