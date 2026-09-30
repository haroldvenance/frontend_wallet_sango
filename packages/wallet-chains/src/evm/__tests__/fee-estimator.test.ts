import { describe, expect, it, vi } from "vitest";

import { EvmFeeEstimator } from "../fee-estimator";
import { EVM_NATIVE_ASSET_ID } from "../config";
import type { AssetRef } from "../../types/asset";
import { ANVIL_ADDRESS_0, mockRpc } from "./_helpers";

const NATIVE_ETH: AssetRef = {
  kind: "native",
  assetId: EVM_NATIVE_ASSET_ID,
  networkId: "ethereum-sepolia",
};

const TO = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`;

describe("EvmFeeEstimator", () => {
  it("computes total = (baseFee*2 + tip) * gasLimit", async () => {
    const rpc = mockRpc({
      estimateGas: vi.fn(async () => 21_000n),
      getBaseFeePerGas: vi.fn(async () => 10_000_000_000n), // 10 gwei
      getMaxPriorityFeePerGas: vi.fn(async () => 1_000_000_000n), // 1 gwei
    });
    const fee = new EvmFeeEstimator(rpc, "ethereum-sepolia");
    const est = await fee.estimate({
      from: ANVIL_ADDRESS_0,
      to: TO,
      assetRef: NATIVE_ETH,
      amount: 1_000_000n,
    });

    // (10 * 2 + 1) gwei = 21 gwei ; 21000 gas → 21 * 21000 * 1e9
    expect(est.total).toBe(21_000_000_000n * 21_000n);
    expect(est.assetId).toBe(EVM_NATIVE_ASSET_ID);
    expect(est.dynamic).toBe(true);
    expect(est.breakdown?.gasLimit).toBe(21_000n);
    expect(est.breakdown?.maxFeePerGas).toBe(21_000_000_000n);
    expect(est.breakdown?.maxPriorityFeePerGas).toBe(1_000_000_000n);
  });

  it("calls estimateGas with the right params", async () => {
    const estimateGas = vi.fn(async () => 50_000n);
    const rpc = mockRpc({ estimateGas });
    const fee = new EvmFeeEstimator(rpc, "ethereum-sepolia");
    await fee.estimate({
      from: ANVIL_ADDRESS_0,
      to: TO,
      assetRef: NATIVE_ETH,
      amount: 42n,
    });
    expect(estimateGas).toHaveBeenCalledWith({
      from: ANVIL_ADDRESS_0,
      to: TO,
      value: 42n,
    });
  });

  it("rejects token assetRef", async () => {
    const fee = new EvmFeeEstimator(mockRpc(), "ethereum-sepolia");
    await expect(
      fee.estimate({
        from: ANVIL_ADDRESS_0,
        to: TO,
        assetRef: { kind: "token", networkId: "ethereum-sepolia", contract: "0x" },
        amount: 1n,
      }),
    ).rejects.toThrow(/only native ETH/);
  });

  it("rejects a network mismatch", async () => {
    const fee = new EvmFeeEstimator(mockRpc(), "ethereum-sepolia");
    await expect(
      fee.estimate({
        from: ANVIL_ADDRESS_0,
        to: TO,
        assetRef: {
          kind: "native",
          assetId: EVM_NATIVE_ASSET_ID,
          networkId: "ethereum-mainnet",
        },
        amount: 1n,
      }),
    ).rejects.toThrow(/network mismatch/);
  });
});
