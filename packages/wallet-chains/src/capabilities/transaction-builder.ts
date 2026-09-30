import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { UnsignedTransaction } from "../types/tx";

/**
 * Paramètres d'une opération wallet (transfert, staking…).
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
 * **Aucune adresse source.** La source (`sender`) est une propriété du
 * `AccountRef` fourni à `WalletSession.send(params, account)`. Le
 * builder reçoit le sender en 2ᵉ argument, déjà résolu par la session.
 *
 * En V0.2, seul le variant `"transfer"` est supporté par le builder
 * SANGO. Les variants staking (`bond`, `delegate`…) seront ajoutés au
 * fur et à mesure que le builder les prend en charge — pas d'API qui
 * prétend supporter ce qu'elle ne sait pas construire.
 */
export type SendParams = {
  readonly kind: "transfer";
  readonly to: Address;
  readonly assetRef: AssetRef;
  readonly amount: bigint;
  readonly memo?: Uint8Array;
};

/**
 * Capacité optionnelle : construire une transaction non signée.
 *
 * @param params  L'intention wallet à encoder.
 * @param sender  Adresse source (hex `0x…` ou bech32m), résolue par la
 *                session via `AddressProvider.deriveAddress(account)`.
 *                Le builder ne reçoit jamais l'`AccountRef` — il ne
 *                connaît que des adresses.
 */
export interface TransactionBuilder {
  build(params: SendParams, sender: Address): Promise<UnsignedTransaction>;
}
