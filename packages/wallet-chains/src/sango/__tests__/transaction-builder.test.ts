import { describe, expect, it, vi } from "vitest";
import { SangoTransactionBuilder } from "../transaction-builder";
import { SANGO_CHAIN_ID_HEX } from "../config";
import { mockRpc } from "./_helpers";
import type { SendParams } from "../../capabilities/transaction-builder";
import type { AssetRef } from "../../types/asset";

const SENDER = "0x" + "aa".repeat(20);
const TO = "0x" + "bb".repeat(20);
const NATIVE: AssetRef = {
  kind: "native",
  assetId: "sango",
  networkId: "sango-devnet",
};

function transferParams(
  overrides: Partial<Extract<SendParams, { kind: "transfer" }>> = {},
): Extract<SendParams, { kind: "transfer" }> {
  return {
    kind: "transfer",
    to: TO,
    assetRef: NATIVE,
    amount: 1000n,
    ...overrides,
  };
}

describe("SangoTransactionBuilder", () => {
  it("builds a transfer using nonce/baseFee from RPC", async () => {
    const rpc = mockRpc({
      getAccount: vi.fn(async () => ({
        address: SENDER,
        publicKey: "0x" + "cc".repeat(32),
        balance: "1000000",
        nonce: 7,
      })),
      getBaseFee: vi.fn(async () => "100"),
    });
    const b = new SangoTransactionBuilder(rpc, "sango-devnet", SANGO_CHAIN_ID_HEX, "testnet");
    const tx = await b.build(transferParams(), SENDER);

    expect(tx.family).toBe("sango");
    expect(tx.networkId).toBe("sango-devnet");
    const p = tx.payload as Record<string, unknown>;
    expect(p.nonce).toBe(7n);
    expect(p.value).toBe(1000n);
    expect(p.maxFee).toBe(200n); // baseFee(100) * 2
    expect(p.gasLimit).toBe(21_000n);
    expect(p.txKind).toBe(1);
    expect((p.chainId as Uint8Array).length).toBe(32);
    expect((p.sender as Uint8Array).length).toBe(20);
    expect((p.recipient as Uint8Array).length).toBe(20);

    // Le meta reflète `sender` (2ᵉ arg) et `to` (params).
    expect(tx.meta.from).toBe(SENDER);
    expect(tx.meta.to).toBe(TO);
    expect(tx.meta.amount).toBe(1000n);
  });

  it("passes publicKey=null for ghost accounts", async () => {
    const rpc = mockRpc({
      getAccount: vi.fn(async () => ({
        address: SENDER,
        publicKey: null,
        balance: "0",
        nonce: 0,
      })),
      getBaseFee: vi.fn(async () => "10"),
    });
    const b = new SangoTransactionBuilder(rpc, "sango-devnet", SANGO_CHAIN_ID_HEX, "testnet");
    const tx = await b.build(transferParams({ amount: 1n }), SENDER);
    expect((tx.payload as Record<string, unknown>).publicKey).toBeNull();
  });

  it("accepts bech32 for `to`", async () => {
    const rpc = mockRpc({
      getAccount: vi.fn(async () => ({
        address: SENDER,
        publicKey: null,
        balance: "0",
        nonce: 0,
      })),
      getBaseFee: vi.fn(async () => "1"),
    });
    const b = new SangoTransactionBuilder(rpc, "sango-devnet", SANGO_CHAIN_ID_HEX, "testnet");
    // Golden vector bech32 testnet → address 02291e07…01ab
    const bech32To = "tsango1qg53upurn4c45nrchpv9gjdhudn65qdtv3xlde";
    const tx = await b.build(transferParams({ to: bech32To, amount: 1n }), SENDER);
    const recipient = (tx.payload as Record<string, unknown>).recipient as Uint8Array;
    let hex = "";
    for (const byte of recipient) hex += byte.toString(16).padStart(2, "0");
    expect(hex).toBe("02291e07839d715a4c78b8585449b7e367aa01ab");
  });

  it("rejects token assetRef", async () => {
    const b = new SangoTransactionBuilder(mockRpc(), "sango-devnet", SANGO_CHAIN_ID_HEX, "testnet");
    await expect(
      b.build(
        transferParams({
          assetRef: { kind: "token", networkId: "sango-devnet", contract: "0x" },
        }),
        SENDER,
      ),
    ).rejects.toThrow(/native SANGO/);
  });

  it("rejects mismatched network", async () => {
    const b = new SangoTransactionBuilder(mockRpc(), "sango-devnet", SANGO_CHAIN_ID_HEX, "testnet");
    await expect(
      b.build(
        transferParams({
          assetRef: {
            kind: "native",
            assetId: "sango",
            networkId: "sango-testnet",
          },
        }),
        SENDER,
      ),
    ).rejects.toThrow(/network mismatch/);
  });
});
