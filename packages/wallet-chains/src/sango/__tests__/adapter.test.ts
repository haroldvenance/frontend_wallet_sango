import { describe, expect, it } from "vitest";
import { sangoAdapterFactory } from "../adapter";
import { SANGO_DEVNET } from "../config";
import { mockRpc, mockSigner } from "./_helpers";

describe("sangoAdapterFactory", () => {
  it("provides all required + optional capabilities (no token provider in V0)", () => {
    const adapter = sangoAdapterFactory(SANGO_DEVNET, {
      rpc: mockRpc(),
      signer: mockSigner(),
    });
    expect(adapter.network).toBe(SANGO_DEVNET);
    expect(adapter.addressProvider).toBeDefined();
    expect(adapter.balanceProvider).toBeDefined();
    expect(adapter.historyProvider).toBeDefined();
    expect(adapter.transactionBuilder).toBeDefined();
    expect(adapter.transactionSigner).toBeDefined();
    expect(adapter.broadcaster).toBeDefined();
    expect(adapter.feeEstimator).toBeDefined();
    expect(adapter.tokenProvider).toBeUndefined();
  });
});
