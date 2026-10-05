import { describe, expect, it, vi } from "vitest";

import { EvmFeeEstimator } from "../fee-estimator";
import type { EvmCallParams } from "../rpc";
import type { AssetRef } from "../../types/asset";
import { ANVIL_ADDRESS_0, mockRpc } from "./_helpers";

const NATIVE_ETH: AssetRef = {
  kind: "native",
  assetId: "eth",
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
    const fee = new EvmFeeEstimator(rpc, "ethereum-sepolia", "eth");
    const est = await fee.estimate({
      from: ANVIL_ADDRESS_0,
      to: TO,
      assetRef: NATIVE_ETH,
      amount: 1_000_000n,
    });

    // (10 * 2 + 1) gwei = 21 gwei ; 21000 gas → 21 * 21000 * 1e9
    expect(est.total).toBe(21_000_000_000n * 21_000n);
    expect(est.assetId).toBe("eth");
    expect(est.dynamic).toBe(true);
    expect(est.breakdown?.gasLimit).toBe(21_000n);
    expect(est.breakdown?.maxFeePerGas).toBe(21_000_000_000n);
    expect(est.breakdown?.maxPriorityFeePerGas).toBe(1_000_000_000n);
  });

  it("calls estimateGas with the right params", async () => {
    const estimateGas = vi.fn(async () => 50_000n);
    const rpc = mockRpc({ estimateGas });
    const fee = new EvmFeeEstimator(rpc, "ethereum-sepolia", "eth");
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

  it("supports token assetRef (E1.6)", async () => {
    // Depuis E1.6, l'estimation accepte les ERC-20 : elle encode
    // transfer(address,uint256) et appelle eth_estimateGas avec data.
    const estimateGas = vi.fn<(tx: EvmCallParams) => Promise<bigint>>(async () => 65_000n);
    const fee = new EvmFeeEstimator(
      mockRpc({
        estimateGas,
        getBaseFeePerGas: vi.fn(async () => 1n),
        getMaxPriorityFeePerGas: vi.fn(async () => 0n),
      }),
      "ethereum-sepolia",
      "eth",
    );

    const est = await fee.estimate({
      from: ANVIL_ADDRESS_0,
      to: TO,
      assetRef: {
        kind: "token",
        networkId: "ethereum-sepolia",
        contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
      amount: 1_000_000n,
    });

    expect(est.dynamic).toBe(true);
    expect(est.breakdown?.gasLimit).toBe(65_000n);

    // Vérifie que estimateGas a bien reçu to=contract + data encodé.
    const firstCall = estimateGas.mock.calls[0];
    expect(firstCall).toBeDefined();
    const arg = firstCall![0];
    expect(arg.to).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(arg.value).toBe(0n);
    expect(typeof arg.data).toBe("string");
    expect((arg.data as string).startsWith("0xa9059cbb")).toBe(true);
  });

  it("rejects a network mismatch", async () => {
    const fee = new EvmFeeEstimator(mockRpc(), "ethereum-sepolia", "eth");
    await expect(
      fee.estimate({
        from: ANVIL_ADDRESS_0,
        to: TO,
        assetRef: {
          kind: "native",
          assetId: "eth",
          networkId: "ethereum-mainnet",
        },
        amount: 1n,
      }),
    ).rejects.toThrow(/network mismatch/);
  });
});
