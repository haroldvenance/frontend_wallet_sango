import type {
  FeeEstimate,
  FeeEstimator,
  FeeParams,
} from "../capabilities/fee-estimator";
import { SANGO_NATIVE_ASSET_ID } from "./config";
import type { SangoRpc } from "./rpc";

const FEE_GAS_LIMIT = 21_000n;
const MAX_FEE_MULTIPLIER = 2n;

/**
 * Estimation de frais SANGO.
 *
 * Formule V0 (fixe, alignée design doc §6.5) :
 *   total = baseFee * 2 * 21 000 gas
 *
 * À raffiner quand le protocole introduira un `eth_estimateGas`
 * côté natif.
 */
export class SangoFeeEstimator implements FeeEstimator {
  readonly #rpc: SangoRpc;
  readonly #networkId: string;

  constructor(rpc: SangoRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async estimate(params: FeeParams): Promise<FeeEstimate> {
    if (
      params.assetRef.kind !== "native" ||
      params.assetRef.assetId !== SANGO_NATIVE_ASSET_ID
    ) {
      throw new Error("SangoFeeEstimator: only native SANGO supported in V0");
    }
    if (params.assetRef.networkId !== this.#networkId) {
      throw new Error(
        `SangoFeeEstimator: network mismatch (expected "${this.#networkId}")`,
      );
    }

    const baseFee = BigInt(await this.#rpc.getBaseFee());
    const maxFee = baseFee * MAX_FEE_MULTIPLIER;
    const total = maxFee * FEE_GAS_LIMIT;

    return {
      assetId: SANGO_NATIVE_ASSET_ID,
      total,
      breakdown: {
        gasLimit: FEE_GAS_LIMIT,
        maxFee,
      },
    };
  }
}
