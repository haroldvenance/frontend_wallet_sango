import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { UnsignedTransaction } from "../types/tx";

export interface SendParams {
  readonly from: Address;
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
