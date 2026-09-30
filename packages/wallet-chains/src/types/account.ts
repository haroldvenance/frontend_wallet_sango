import type { Address } from "./address";
import type { ChainFamily } from "./chain";

/**
 * Référence à un compte HD, valable pour toutes les familles.
 *
 * Vit dans `wallet-chains` (et non `wallet-core`) parce qu'il est
 * utilisé par les capabilities. `wallet-core` reste agnostique : c'est
 * la session qui fait le pont.
 *
 * En V0, `accountIndex` est toujours `0` (pas de HD multi-comptes).
 */
export interface AccountRef {
  readonly family: ChainFamily;
  readonly accountIndex: number;
  readonly networkId: string;
}

/**
 * État d'un compte à un instant donné.
 *
 * Concept universel : toute chaîne a au minimum une adresse et un
 * solde. `nonce` et `publicKey` sont optionnels selon la famille
 * (BTC : nonce=0 ; SOL : nonce=blockhash récent ; comptes ghost :
 * publicKey=null).
 *
 * ⚠️ `balance` est en **base units** (bigint). `publicKey` est en
 *    **hex** (`0x…`, 32 bytes Ed25519 pour SANGO) ou `null`.
 */
export interface AccountState {
  readonly address: Address;
  readonly publicKey: string | null;
  readonly balance: bigint;
  readonly nonce: number;
}
