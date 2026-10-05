import { encodeFunctionData, type Address as ViemAddress } from "viem";

import type {
  FeeEstimate,
  FeeEstimator,
  FeeParams,
} from "../capabilities/fee-estimator";
import type { Address } from "../types/address";
import { ERC20_ABI } from "./erc20-abi";
import type { EvmRpc } from "./rpc";

/**
 * Estimation de frais EIP-1559 (D-GAS-1).
 *
 * **E1.6** — Supporte les transferts natifs et ERC-20 :
 *   - `transfer`       → `eth_estimateGas({ to, value })`
 *   - `transferErc20`  → `eth_estimateGas({ to: contract, data })`
 *
 * La formule reste :
 *   maxFeePerGas = baseFeePerGas * 2n + maxPriorityFeePerGas
 *   total        = maxFeePerGas * gasLimit
 *
 * Le multiplicateur `* 2n` suit la recommandation MetaMask /
 * Ethereum docs : couvre une hausse de baseFee jusqu'à 2× avant que
 * la tx ne soit rejetée.
 */
const BASE_FEE_MULTIPLIER = 2n;

export class EvmFeeEstimator implements FeeEstimator {
  readonly #rpc: EvmRpc;
  readonly #networkId: string;
  readonly #nativeAsset: string;

  constructor(rpc: EvmRpc, networkId: string, nativeAsset: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
    this.#nativeAsset = nativeAsset;
  }

  async estimate(params: FeeParams): Promise<FeeEstimate> {
    if (params.assetRef.networkId !== this.#networkId) {
      throw new Error(
        `EvmFeeEstimator: network mismatch (expected "${this.#networkId}", got "${params.assetRef.networkId}")`,
      );
    }

    // 1. Estimation du gas (natif ou ERC-20).
    let gasLimit: bigint;
    if (params.assetRef.kind === "native") {
      if (params.assetRef.assetId !== this.#nativeAsset) {
        throw new Error(
          `EvmFeeEstimator: unsupported native asset "${params.assetRef.assetId}"`,
        );
      }
      gasLimit = await this.#rpc.estimateGas({
        from: params.from,
        to: params.to,
        value: params.amount,
      });
    } else {
      // ERC-20 : encode transfer(address,uint256) dans data.
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [params.to as ViemAddress, params.amount],
      });
      gasLimit = await this.#rpc.estimateGas({
        from: params.from,
        to: params.assetRef.contract as Address,
        value: 0n,
        data,
      });
    }

    // 2. Base fee + tip.
    const [baseFeePerGas, maxPriorityFeePerGas] = await Promise.all([
      this.#rpc.getBaseFeePerGas(),
      this.#rpc.getMaxPriorityFeePerGas(),
    ]);

    const maxFeePerGas = baseFeePerGas * BASE_FEE_MULTIPLIER + maxPriorityFeePerGas;
    const total = maxFeePerGas * gasLimit;

    // Le fee est TOUJOURS dans l'asset natif du réseau (gas token),
    // même pour un transfert ERC-20.
    return {
      assetId: this.#nativeAsset,
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
