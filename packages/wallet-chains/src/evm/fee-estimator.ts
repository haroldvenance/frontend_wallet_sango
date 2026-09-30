import type {
  FeeEstimate,
  FeeEstimator,
  FeeParams,
} from "../capabilities/fee-estimator";
import type { Address } from "../types/address";
import { EVM_NATIVE_ASSET_ID } from "./config";
import type { EvmRpc } from "./rpc";

/**
 * Estimation de frais EIP-1559 (D-GAS-1).
 *
 * Formule :
 *   maxFeePerGas = baseFeePerGas * 2n + maxPriorityFeePerGas
 *   total        = maxFeePerGas * gasLimit
 *
 * Le multiplicateur `* 2n` sur la baseFee suit la recommandation
 * MetaMask / Ethereum docs : couvre une hausse de baseFee jusqu'à 2×
 * avant que la tx ne soit rejetée.
 *
 * La `gasLimit` est calculée par `eth_estimateGas` (pas hardcodée).
 */
const BASE_FEE_MULTIPLIER = 2n;

export class EvmFeeEstimator implements FeeEstimator {
  readonly #rpc: EvmRpc;
  readonly #networkId: string;

  constructor(rpc: EvmRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async estimate(params: FeeParams): Promise<FeeEstimate> {
    if (
      params.assetRef.kind !== "native" ||
      params.assetRef.assetId !== EVM_NATIVE_ASSET_ID
    ) {
      throw new Error(
        "EvmFeeEstimator: only native ETH supported in E1",
      );
    }
    if (params.assetRef.networkId !== this.#networkId) {
      throw new Error(
        `EvmFeeEstimator: network mismatch (expected "${this.#networkId}")`,
      );
    }

    // 1. Estimation du gas (par opcode EVM).
    const gasLimit = await this.#rpc.estimateGas({
      from: params.from,
      to: params.to,
      value: params.amount,
    });

    // 2. Base fee + tip.
    const [baseFeePerGas, maxPriorityFeePerGas] = await Promise.all([
      this.#rpc.getBaseFeePerGas(),
      this.#rpc.getMaxPriorityFeePerGas(),
    ]);

    const maxFeePerGas = baseFeePerGas * BASE_FEE_MULTIPLIER + maxPriorityFeePerGas;
    const total = maxFeePerGas * gasLimit;

    return {
      assetId: EVM_NATIVE_ASSET_ID,
      total,
      breakdown: {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      },
      dynamic: true,
    };
  }
}

// Silence unused-import warning si `Address` n'est jamais directement
// utilisé (le typage passe par FeeParams).
void 0 as unknown as Address;
