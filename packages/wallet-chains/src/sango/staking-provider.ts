import type { StakingProvider } from "../capabilities/staking-provider";
import type { Address } from "../types/address";
import type {
  Delegation,
  PendingUnbonding,
  ValidatorInfo,
} from "../types/staking";
import type { SangoRpc } from "./rpc";

/**
 * Implémentation SANGO de `StakingProvider`.
 *
 * Forward direct vers les 4 méthodes RPC — pas de transformation. Les
 * types locaux (`wallet-chains/types/staking.ts`) sont structurellement
 * identiques à ceux de `@sango/rpc`, donc la conversion est implicit.
 */
export class SangoStakingProvider implements StakingProvider {
  readonly #rpc: SangoRpc;

  constructor(rpc: SangoRpc) {
    this.#rpc = rpc;
  }

  async listValidators(): Promise<readonly ValidatorInfo[]> {
    return this.#rpc.getValidators();
  }

  async getValidatorInfo(validator: Address): Promise<ValidatorInfo | null> {
    return this.#rpc.getValidatorInfo(validator);
  }

  async getDelegations(delegator: Address): Promise<readonly Delegation[]> {
    return this.#rpc.getDelegations(delegator);
  }

  async getPendingUnbondings(
    delegator: Address,
  ): Promise<readonly PendingUnbonding[]> {
    return this.#rpc.getPendingUnbondings(delegator);
  }
}
