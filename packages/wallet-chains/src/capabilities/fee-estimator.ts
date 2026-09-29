import type { Address } from "../types/address";
import type { AssetId, AssetRef } from "../types/asset";

export interface FeeParams {
  readonly from: Address;
  readonly to: Address;
  readonly assetRef: AssetRef;
  readonly amount: bigint;
}

/**
 * Estimation de frais. `total` est en base units de `assetId`.
 */
export interface FeeEstimate {
  readonly assetId: AssetId;
  readonly total: bigint;
  readonly breakdown?: Readonly<Record<string, bigint>>;
}

/**
 * Capacité optionnelle : estimer les frais d'une tx.
 */
export interface FeeEstimator {
  estimate(params: FeeParams): Promise<FeeEstimate>;
}
