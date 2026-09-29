import type { ChainFamily } from "./chain";

/**
 * Référence à un compte HD, valable pour toutes les familles.
 *
 * Vit dans `wallet-chains` (et non `wallet-core`) parce qu'il est
 * utilisé par les capabilities. `wallet-core` reste agnostique : c'est
 * la session qui fait le pont.
 *
 * En V0, `accountIndex` est toujours `0` (pas encore de HD derivation
 * multi-comptes).
 */
export interface AccountRef {
  readonly family: ChainFamily;
  readonly accountIndex: number;
  readonly networkId: string;
}
