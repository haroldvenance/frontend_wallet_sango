import { describe, expect, it, vi } from "vitest";

import { EvmBalanceProvider } from "../balance-provider";
import { EVM_DECIMALS } from "../config";
import type { AssetRef } from "../../types/asset";
import { ANVIL_ADDRESS_0, mockRpc } from "./_helpers";

const NATIVE_ETH: AssetRef = {
  kind: "native",
  assetId: "eth",
  networkId: "ethereum-sepolia",
};

describe("EvmBalanceProvider", () => {
  it("returns amount (wei) + decimals 18 from rpc.getBalance", async () => {
    const rpc = mockRpc({
      getBalance: vi.fn(async () => 1_234_567_890_000_000_000n), // 1.23... ETH
    });
    const p = new EvmBalanceProvider(rpc, "ethereum-sepolia", "eth");
    const bal = await p.getBalance(ANVIL_ADDRESS_0, NATIVE_ETH);
    expect(bal.amount).toBe(1_234_567_890_000_000_000n);
    expect(bal.assetId).toBe("eth");
    expect(bal.networkId).toBe("ethereum-sepolia");
    expect(bal.decimals).toBe(EVM_DECIMALS);
    expect(rpc.getBalance).toHaveBeenCalledWith(ANVIL_ADDRESS_0);
  });

  it("returns 0n for an unknown address", async () => {
    const p = new EvmBalanceProvider(mockRpc(), "ethereum-sepolia", "eth");
    const bal = await p.getBalance(ANVIL_ADDRESS_0, NATIVE_ETH);
    expect(bal.amount).toBe(0n);
  });

  it("rejects token assetRef (E1 not supported)", async () => {
    const p = new EvmBalanceProvider(mockRpc(), "ethereum-sepolia", "eth");
    await expect(
      p.getBalance(ANVIL_ADDRESS_0, {
        kind: "token",
        networkId: "ethereum-sepolia",
        contract: "0xdead",
      }),
    ).rejects.toThrow(/token/);
  });

  it("rejects a non-eth native asset", async () => {
    const p = new EvmBalanceProvider(mockRpc(), "ethereum-sepolia", "eth");
    await expect(
      p.getBalance(ANVIL_ADDRESS_0, {
        kind: "native",
        assetId: "sango",
        networkId: "ethereum-sepolia",
      }),
    ).rejects.toThrow(/unsupported asset/);
  });

  it("rejects a network mismatch", async () => {
    const p = new EvmBalanceProvider(mockRpc(), "ethereum-sepolia", "eth");
    await expect(
      p.getBalance(ANVIL_ADDRESS_0, {
        kind: "native",
        assetId: "eth",
        networkId: "ethereum-mainnet",
      }),
    ).rejects.toThrow(/network mismatch/);
  });
});
