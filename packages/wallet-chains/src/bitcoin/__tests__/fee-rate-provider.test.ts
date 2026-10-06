import { describe, expect, it, vi } from "vitest";

import { BitcoinFeeRateProvider } from "../fee-rate-provider";
import { mockBitcoinRpc } from "./_helpers";

describe("BitcoinFeeRateProvider", () => {
  it("retourne les 3 niveaux", async () => {
    const rpc = mockBitcoinRpc({
      getFeeRates: vi.fn(async () => ({ fast: 12n, normal: 6n, slow: 2n })),
    });
    const provider = new BitcoinFeeRateProvider(rpc);
    const rates = await provider.getFeeRates();
    expect(rates).toEqual({ fast: 12n, normal: 6n, slow: 2n });
  });

  it("sanitize : 0 → 1 (minimum viable)", async () => {
    const rpc = mockBitcoinRpc({
      getFeeRates: vi.fn(async () => ({ fast: 0n, normal: 0n, slow: 0n })),
    });
    const provider = new BitcoinFeeRateProvider(rpc);
    const rates = await provider.getFeeRates();
    expect(rates).toEqual({ fast: 1n, normal: 1n, slow: 1n });
  });

  it("sanitize : négatif → 1", async () => {
    const rpc = mockBitcoinRpc({
      getFeeRates: vi.fn(async () => ({ fast: -5n, normal: 3n, slow: 0n })),
    });
    const provider = new BitcoinFeeRateProvider(rpc);
    const rates = await provider.getFeeRates();
    expect(rates).toEqual({ fast: 1n, normal: 3n, slow: 1n });
  });

  it("propage une erreur RPC", async () => {
    const rpc = mockBitcoinRpc({
      getFeeRates: vi.fn(async () => {
        throw new Error("HTTP 503");
      }),
    });
    const provider = new BitcoinFeeRateProvider(rpc);
    await expect(provider.getFeeRates()).rejects.toThrow("HTTP 503");
  });
});
