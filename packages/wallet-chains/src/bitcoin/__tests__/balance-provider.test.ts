import { describe, expect, it, vi } from "vitest";

import { asAddress } from "../../types/address";
import type { AssetRef } from "../../types/asset";
import { BitcoinBalanceProvider } from "../balance-provider";
import { BITCOIN_DECIMALS, BITCOIN_NATIVE_ASSET_ID } from "../constants";
import { BitcoinUtxoProvider } from "../utxo-provider";
import { TESTNET_ADDRESS, mockBitcoinRpc, utxo } from "./_helpers";

const NATIVE_BTC: AssetRef = {
  kind: "native",
  assetId: BITCOIN_NATIVE_ASSET_ID,
  networkId: "bitcoin-testnet",
};

const ADDR = asAddress(TESTNET_ADDRESS);

describe("BitcoinBalanceProvider", () => {
  it("somme les UTXOs (sats)", async () => {
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => [
        utxo({ txid: "a".repeat(64), value: 100_000n }),
        utxo({ txid: "b".repeat(64), vout: 1, value: 250_000n }),
      ]),
    });
    const provider = new BitcoinBalanceProvider(
      new BitcoinUtxoProvider(rpc),
      "bitcoin-testnet",
    );
    const balance = await provider.getBalance(ADDR, NATIVE_BTC);

    expect(balance.amount).toBe(350_000n);
    expect(balance.assetId).toBe(BITCOIN_NATIVE_ASSET_ID);
    expect(balance.networkId).toBe("bitcoin-testnet");
    expect(balance.decimals).toBe(BITCOIN_DECIMALS);
  });

  it("retourne 0n si aucun UTXO", async () => {
    const rpc = mockBitcoinRpc();
    const provider = new BitcoinBalanceProvider(
      new BitcoinUtxoProvider(rpc),
      "bitcoin-testnet",
    );
    const balance = await provider.getBalance(ADDR, NATIVE_BTC);
    expect(balance.amount).toBe(0n);
  });

  it("ignore les UTXOs avec value = 0 (dust)", async () => {
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => [
        utxo({ txid: "a".repeat(64), value: 100_000n }),
        utxo({ txid: "b".repeat(64), value: 0n }), // dust
      ]),
    });
    const provider = new BitcoinBalanceProvider(
      new BitcoinUtxoProvider(rpc),
      "bitcoin-testnet",
    );
    const balance = await provider.getBalance(ADDR, NATIVE_BTC);
    expect(balance.amount).toBe(100_000n);
  });

  it("ignore les UTXOs avec txid invalide", async () => {
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => [
        utxo({ txid: "a".repeat(64), value: 100_000n }),
        utxo({ txid: "not-hex", value: 1_000_000n }),
        utxo({ txid: "abc", value: 1_000_000n }),
      ]),
    });
    const provider = new BitcoinBalanceProvider(
      new BitcoinUtxoProvider(rpc),
      "bitcoin-testnet",
    );
    const balance = await provider.getBalance(ADDR, NATIVE_BTC);
    expect(balance.amount).toBe(100_000n);
  });

  it("rejette un assetRef token", async () => {
    const provider = new BitcoinBalanceProvider(
      new BitcoinUtxoProvider(mockBitcoinRpc()),
      "bitcoin-testnet",
    );
    await expect(
      provider.getBalance(ADDR, {
        kind: "token",
        networkId: "bitcoin-testnet",
        contract: "0xdead",
      }),
    ).rejects.toThrow(/native BTC/);
  });

  it("rejette un assetId non-btc", async () => {
    const provider = new BitcoinBalanceProvider(
      new BitcoinUtxoProvider(mockBitcoinRpc()),
      "bitcoin-testnet",
    );
    await expect(
      provider.getBalance(ADDR, {
        kind: "native",
        assetId: "eth",
        networkId: "bitcoin-testnet",
      }),
    ).rejects.toThrow(/unsupported asset/);
  });

  it("rejette un network mismatch", async () => {
    const provider = new BitcoinBalanceProvider(
      new BitcoinUtxoProvider(mockBitcoinRpc()),
      "bitcoin-testnet",
    );
    await expect(
      provider.getBalance(ADDR, {
        kind: "native",
        assetId: BITCOIN_NATIVE_ASSET_ID,
        networkId: "bitcoin-mainnet",
      }),
    ).rejects.toThrow(/network mismatch/);
  });
});
