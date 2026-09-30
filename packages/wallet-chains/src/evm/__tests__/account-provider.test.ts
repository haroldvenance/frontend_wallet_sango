import { describe, expect, it, vi } from "vitest";

import { EvmAccountProvider } from "../account-provider";
import { ANVIL_ADDRESS_0, mockRpc } from "./_helpers";

describe("EvmAccountProvider", () => {
  it("returns { address, publicKey: null, balance, nonce }", async () => {
    const rpc = mockRpc({
      getBalance: vi.fn(async () => 5_000_000_000_000_000_000n),
      getTransactionCount: vi.fn(async () => 42),
    });
    const p = new EvmAccountProvider(rpc, "ethereum-sepolia");
    const acc = await p.getAccount(ANVIL_ADDRESS_0);

    expect(acc).not.toBeNull();
    expect(acc!.address).toBe(ANVIL_ADDRESS_0);
    // EVM n'expose PAS la pubkey via le RPC.
    expect(acc!.publicKey).toBeNull();
    expect(acc!.balance).toBe(5_000_000_000_000_000_000n);
    expect(acc!.nonce).toBe(42);
  });

  it("fetches balance and nonce in parallel (both called)", async () => {
    const getBalance = vi.fn(async () => 0n);
    const getTransactionCount = vi.fn(async () => 0);
    const rpc = mockRpc({ getBalance, getTransactionCount });
    const p = new EvmAccountProvider(rpc, "ethereum-sepolia");
    await p.getAccount(ANVIL_ADDRESS_0);

    expect(getBalance).toHaveBeenCalledWith(ANVIL_ADDRESS_0);
    expect(getTransactionCount).toHaveBeenCalledWith(ANVIL_ADDRESS_0);
  });

  it("returns a valid AccountState for an uninitialized account (never null)", async () => {
    // Différence clé avec SANGO : un compte EVM inexistant n'est pas
    // null — toute adresse 20 bytes est potentiellement valide.
    const p = new EvmAccountProvider(mockRpc(), "ethereum-sepolia");
    const acc = await p.getAccount(ANVIL_ADDRESS_0);
    expect(acc).not.toBeNull();
    expect(acc!.balance).toBe(0n);
    expect(acc!.nonce).toBe(0);
    expect(acc!.publicKey).toBeNull();
  });

  it("propagates RPC errors", async () => {
    const rpc = mockRpc({
      getBalance: vi.fn(async () => {
        throw new Error("RPC down");
      }),
    });
    const p = new EvmAccountProvider(rpc, "ethereum-sepolia");
    await expect(p.getAccount(ANVIL_ADDRESS_0)).rejects.toThrow("RPC down");
  });
});
