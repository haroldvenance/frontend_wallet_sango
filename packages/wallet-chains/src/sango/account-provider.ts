import type { AccountProvider } from "../capabilities/account-provider";
import type { AccountState } from "../types/account";
import type { SangoRpc } from "./rpc";

/**
 * Lecture de l'état complet d'un compte SANGO via `sango_getAccount`.
 *
 * Miroir exact de `BalanceProvider` mais expose **tous** les champs
 * (nonce + publicKey + balance) — utile pour la signature et pour
 * l'UI (affichage nonce, détection ghost).
 *
 * Le RPC retourne `null` pour un compte inexistant ; on propage ce
 * `null` tel quel (l'UI décide de l'affichage "compte non initialisé").
 */
export class SangoAccountProvider implements AccountProvider {
  readonly #rpc: SangoRpc;

  constructor(rpc: SangoRpc) {
    this.#rpc = rpc;
  }

  async getAccount(address: string): Promise<AccountState | null> {
    const account = await this.#rpc.getAccount(address);
    if (!account) return null;

    return {
      address: account.address,
      publicKey: account.publicKey,
      balance: BigInt(account.balance),
      nonce: account.nonce,
    };
  }
}
