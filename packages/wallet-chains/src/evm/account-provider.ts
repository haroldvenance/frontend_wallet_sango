import type { AccountProvider } from "../capabilities/account-provider";
import type { AccountState } from "../types/account";
import type { Address } from "../types/address";
import type { EvmRpc } from "./rpc";

/**
 * Lecture de l'état complet d'un compte EVM.
 *
 * Expose le **nonce** (compteur de txs sortantes), nécessaire au
 * `TransactionBuilder` EIP-1559 (patch 4) et à l'UI (badge "compte
 * non initialisé" si nonce === 0 && balance === 0).
 *
 * ⚠️ Pour EVM, la `publicKey` du compte n'est **pas** accessible
 *    via le RPC (seul le hash de l'adresse l'est). Le champ
 *    `publicKey` est donc toujours `null` — c'est une différence
 *    structurelle avec SANGO, où la pubkey Ed25519 est enregistrée
 *    on-chain. Le `AccountState.publicKey` reflète cet état.
 *
 * Un compte inexistant (adresse jamais vue) est retourné comme un
 * `AccountState` avec balance 0n et nonce 0, plutôt que `null`. Ce
 * choix est cohérent avec le comportement EVM : toute adresse est
 * "valide" (non enregistrée ≠ inexistante), contrairement à SANGO
 * où `getAccount()` retourne `null` pour un compte ghost.
 */
export class EvmAccountProvider implements AccountProvider {
  readonly #rpc: EvmRpc;
  readonly #networkId: string;

  constructor(rpc: EvmRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async getAccount(address: Address): Promise<AccountState | null> {
    const [balance, nonce] = await Promise.all([
      this.#rpc.getBalance(address),
      this.#rpc.getTransactionCount(address),
    ]);

    return {
      address,
      publicKey: null,
      balance,
      nonce,
    };
  }

  /** Exposé pour les tests / cohérence — pas utilisé par la session. */
  get networkId(): string {
    return this.#networkId;
  }
}
