import type { ChainFamily } from "./chain";

/**
 * Référence à un compte HD, valable pour toutes les familles.
 *
 * Ce type vit dans `wallet-chains` (et non `wallet-core`) parce qu'il
 * est utilisé par les capabilities (`AddressProvider`,
 * `TransactionSigner`). `wallet-core` reste agnostique.
 */
export interface AccountRef {
  readonly family: ChainFamily;
  readonly accountIndex: number;
  readonly networkId: string;
}
