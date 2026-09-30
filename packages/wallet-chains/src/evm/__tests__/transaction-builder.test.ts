import { describe, expect, it, vi } from "vitest";

import { EvmTransactionBuilder } from "../transaction-builder";
import type { SendParams } from "../../capabilities/transaction-builder";
import type { AssetRef } from "../../types/asset";
import { ANVIL_ADDRESS_0, mockRpc } from "./_helpers";

const NATIVE_ETH: AssetRef = {
  kind: "native",
  assetId: "eth",
  networkId: "ethereum-sepolia",
};
const TO = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`;
const SEPOLIA_CHAIN_ID = 11_155_111;

function makeBuilder(rpc = mockRpc()) {
  return new EvmTransactionBuilder(rpc, "ethereum-sepolia", SEPOLIA_CHAIN_ID);
}

const TRANSFER_PARAMS: SendParams = {
  kind: "transfer",
  to: TO,
  assetRef: NATIVE_ETH,
  amount: 1_000_000_000_000_000_000n,
};

describe("EvmTransactionBuilder — transfer", () => {
  it("builds EIP-1559 fields from RPC data", async () => {
    const rpc = mockRpc({
      getTransactionCount: vi.fn(async () => 7),
      estimateGas: vi.fn(async () => 21_000n),
      getBaseFeePerGas: vi.fn(async () => 10_000_000_000n),
      getMaxPriorityFeePerGas: vi.fn(async () => 1_000_000_000n),
    });
    const b = makeBuilder(rpc);
    const tx = await b.build(TRANSFER_PARAMS, ANVIL_ADDRESS_0);

    expect(tx.family).toBe("evm");
    expect(tx.networkId).toBe("ethereum-sepolia");
    const p = tx.payload as Record<string, unknown>;
    expect(p.chainId).toBe(SEPOLIA_CHAIN_ID);
    expect(p.nonce).toBe(7);
    expect(p.to).toBe(TO);
    expect(p.value).toBe(1_000_000_000_000_000_000n);
    expect(p.gasLimit).toBe(21_000n);
    expect(p.maxFeePerGas).toBe(21_000_000_000n);
    expect(p.maxPriorityFeePerGas).toBe(1_000_000_000n);
    expect(p.data).toBeUndefined();
  });

  it("forwards `memo` as data", async () => {
    const b = makeBuilder();
    const tx = await b.build(
      { ...TRANSFER_PARAMS, memo: new Uint8Array([0xde, 0xad]) },
      ANVIL_ADDRESS_0,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.data).toBe("0xdead");
  });

  it("meta reflects sender, to, amount", async () => {
    const b = makeBuilder();
    const tx = await b.build(TRANSFER_PARAMS, ANVIL_ADDRESS_0);
    expect(tx.meta.from).toBe(ANVIL_ADDRESS_0);
    expect(tx.meta.to).toBe(TO);
    expect(tx.meta.amount).toBe(1_000_000_000_000_000_000n);
  });

  it("calls getTransactionCount with the sender", async () => {
    const getTransactionCount = vi.fn(async () => 0);
    const b = makeBuilder(mockRpc({ getTransactionCount }));
    await b.build(TRANSFER_PARAMS, ANVIL_ADDRESS_0);
    expect(getTransactionCount).toHaveBeenCalledWith(ANVIL_ADDRESS_0);
  });
});

describe("EvmTransactionBuilder — validation", () => {
  it("rejects non-transfer kinds (staking is SANGO-only)", async () => {
    const b = makeBuilder();
    const bondParams = {
      kind: "bond" as const,
      assetRef: NATIVE_ETH,
      amount: 1n,
    };
    await expect(b.build(bondParams, ANVIL_ADDRESS_0)).rejects.toThrow(
      /only "transfer" supported in E1/,
    );
  });

  it("rejects token assetRef", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        {
          kind: "transfer",
          to: TO,
          assetRef: { kind: "token", networkId: "ethereum-sepolia", contract: "0x" },
          amount: 1n,
        },
        ANVIL_ADDRESS_0,
      ),
    ).rejects.toThrow(/only native ETH/);
  });

  it("rejects mismatched network", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        {
          kind: "transfer",
          to: TO,
          assetRef: { kind: "native", assetId: "eth", networkId: "ethereum-mainnet" },
          amount: 1n,
        },
        ANVIL_ADDRESS_0,
      ),
    ).rejects.toThrow(/network mismatch/);
  });
});
