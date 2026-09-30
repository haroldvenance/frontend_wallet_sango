import { describe, expect, it } from "vitest";

import { evmAdapterFactory } from "../adapter";
import { ETHEREUM_SEPOLIA } from "../config";
import { mockRpc, mockSigner } from "./_helpers";

const SEPOLIA_CHAIN_ID = 11_155_511 as const;

function makeAdapter() {
  return evmAdapterFactory(ETHEREUM_SEPOLIA, {
    rpc: mockRpc(),
    signer: mockSigner(),
    chainId: SEPOLIA_CHAIN_ID,
  });
}

describe("evmAdapterFactory — capacités exposées (patch 4)", () => {
  it("exposes address/balance/account providers (patch 2)", () => {
    const adapter = makeAdapter();
    expect(adapter.network).toBe(ETHEREUM_SEPOLIA);
    expect(adapter.addressProvider).toBeDefined();
    expect(adapter.balanceProvider).toBeDefined();
    expect(adapter.accountProvider).toBeDefined();
  });

  it("exposes fee/transaction/broadcast capabilities (patch 4)", () => {
    const adapter = makeAdapter();
    expect(adapter.feeEstimator).toBeDefined();
    expect(adapter.transactionBuilder).toBeDefined();
    expect(adapter.transactionSigner).toBeDefined();
    expect(adapter.broadcaster).toBeDefined();
  });

  it("exposes a history stub returning an empty page", async () => {
    const adapter = makeAdapter();
    const page = await adapter.historyProvider.getHistory({
      address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      limit: 20,
    });
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });
});

describe("evmAdapterFactory — capacités absentes", () => {
  it("does NOT expose staking/token/txDetail (post-E1)", () => {
    const adapter = makeAdapter();
    expect(adapter.stakingProvider).toBeUndefined();
    expect(adapter.tokenProvider).toBeUndefined();
    expect(adapter.txDetailProvider).toBeUndefined();
  });
});

describe("evmAdapterFactory — validation", () => {
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
        {
          rpc: mockRpc(),
          signer: mockSigner(),
          chainId: SEPOLIA_CHAIN_ID,
        },
      ),
    ).toThrow(/expected family "evm"/);
  });
});
