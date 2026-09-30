import { describe, expect, it } from "vitest";

import { evmAdapterFactory } from "../adapter";
import { ETHEREUM_SEPOLIA } from "../config";
import { mockRpc, mockSigner } from "./_helpers";

describe("evmAdapterFactory", () => {
  it("exposes address/balance/account providers (patch 2)", () => {
    const adapter = evmAdapterFactory(ETHEREUM_SEPOLIA, {
      rpc: mockRpc(),
      signer: mockSigner(),
    });
    expect(adapter.network).toBe(ETHEREUM_SEPOLIA);
    expect(adapter.addressProvider).toBeDefined();
    expect(adapter.balanceProvider).toBeDefined();
    expect(adapter.accountProvider).toBeDefined();
  });

  it("exposes a history stub returning an empty page", async () => {
    const adapter = evmAdapterFactory(ETHEREUM_SEPOLIA, {
      rpc: mockRpc(),
      signer: mockSigner(),
    });
    const page = await adapter.historyProvider.getHistory({
      address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      limit: 20,
    });
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  it("does NOT expose transaction/fee/staking/token capabilities", () => {
    const adapter = evmAdapterFactory(ETHEREUM_SEPOLIA, {
      rpc: mockRpc(),
      signer: mockSigner(),
    });
    expect(adapter.transactionBuilder).toBeUndefined();
    expect(adapter.transactionSigner).toBeUndefined();
    expect(adapter.broadcaster).toBeUndefined();
    expect(adapter.feeEstimator).toBeUndefined();
    expect(adapter.stakingProvider).toBeUndefined();
    expect(adapter.tokenProvider).toBeUndefined();
    expect(adapter.txDetailProvider).toBeUndefined();
  });

  it("rejects a non-evm network", () => {
    expect(() =>
      evmAdapterFactory(
        {
          id: "sango-devnet",
          family: "sango",
          name: "Sango Devnet",
          chainId: "0x00",
          nativeAsset: "sango",
          defaultRpcEndpoints: [],
        },
        { rpc: mockRpc(), signer: mockSigner() },
      ),
    ).toThrow(/expected family "evm"/);
  });
});
