import { describe, expect, it, vi } from "vitest";
import { SangoFeeEstimator } from "../fee-estimator";
import { mockRpc } from "./_helpers";
import type { AssetRef } from "../../types/asset";

const NATIVE: AssetRef = {
  kind: "native",
  assetId: "sango",
  networkId: "sango-devnet",
};

describe("SangoFeeEstimator", () => {
  it("returns total = baseFee * 2 * 21 000", async () => {
    const rpc = mockRpc({ getBaseFee: vi.fn(async () => "100") });
    const f = new SangoFeeEstimator(rpc, "sango-devnet");
    const est = await f.estimate({
      from: "0x" + "aa".repeat(20),
      to: "0x" + "bb".repeat(20),
      assetRef: NATIVE,
      amount: 1n,
    });
    expect(est.total).toBe(100n * 2n * 21_000n); // 4 200 000
    expect(est.assetId).toBe("sango");
    expect(est.breakdown?.gasLimit).toBe(21_000n);
    expect(est.breakdown?.maxFee).toBe(200n);
  });

  it("rejects token assetRef", async () => {
    const f = new SangoFeeEstimator(mockRpc(), "sango-devnet");
    await expect(
      f.estimate({
        from: "0x" + "aa".repeat(20),
        to: "0x" + "bb".repeat(20),
        assetRef: { kind: "token", networkId: "sango-devnet", contract: "0x" },
        amount: 1n,
      }),
    ).rejects.toThrow(/native SANGO/);
  });
});
