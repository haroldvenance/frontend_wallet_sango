import { asAddress } from "../../types/address";
import { describe, expect, it, vi } from "vitest";
import { SangoBalanceProvider } from "../balance-provider";
import { mockRpc } from "./_helpers";
import type { AssetRef } from "../../types/asset";

const ADDR = asAddress("aa".repeat(20));
const NATIVE: AssetRef = {
  kind: "native",
  assetId: "sango",
  networkId: "sango-devnet",
};

describe("SangoBalanceProvider", () => {
  it("returns amount/decimals from sango_getAccount", async () => {
    const rpc = mockRpc({
      getAccount: vi.fn(async () => ({
        address: ADDR,
        publicKey: null,
        balance: "12345000000",
        nonce: 5,
      })),
    });
    const p = new SangoBalanceProvider(rpc, "sango-devnet");
    const bal = await p.getBalance(ADDR, NATIVE);
    expect(bal.amount).toBe(12_345_000_000n);
    expect(bal.assetId).toBe("sango");
    expect(bal.networkId).toBe("sango-devnet");
    expect(bal.decimals).toBe(7);
  });

  it("treats unknown accounts as balance 0", async () => {
    const p = new SangoBalanceProvider(mockRpc(), "sango-devnet");
    const bal = await p.getBalance(ADDR, NATIVE);
    expect(bal.amount).toBe(0n);
  });

  it("rejects token assetRef (V0)", async () => {
    const p = new SangoBalanceProvider(mockRpc(), "sango-devnet");
    await expect(
      p.getBalance(ADDR, {
        kind: "token",
        networkId: "sango-devnet",
        contract: "0xdead",
      }),
    ).rejects.toThrow(/token/i);
  });

  it("rejects mismatched network", async () => {
    const p = new SangoBalanceProvider(mockRpc(), "sango-devnet");
    await expect(
      p.getBalance(ADDR, {
        kind: "native",
        assetId: "sango",
        networkId: "sango-testnet",
      }),
    ).rejects.toThrow(/network mismatch/);
  });
});