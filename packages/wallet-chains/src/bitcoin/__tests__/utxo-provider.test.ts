import { describe, expect, it, vi } from "vitest";

import { BitcoinUtxoProvider } from "../utxo-provider";
import { TESTNET_ADDRESS, mockBitcoinRpc, utxo } from "./_helpers";

describe("BitcoinUtxoProvider", () => {
  it("forward le RPC si tous les UTXOs sont valides", async () => {
    const items = [
      utxo({ txid: "a".repeat(64), value: 100_000n }),
      utxo({ txid: "b".repeat(64), value: 50_000n }),
    ];
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => items),
      getTxs: async () => [],
    });
    const provider = new BitcoinUtxoProvider(rpc);
    const result = await provider.getUtxos(TESTNET_ADDRESS);
    expect(result).toHaveLength(2);
    expect(rpc.getUtxos).toHaveBeenCalledWith(TESTNET_ADDRESS);
  });

  it("retourne [] pour une adresse sans UTXO", async () => {
    const provider = new BitcoinUtxoProvider(mockBitcoinRpc());
    const result = await provider.getUtxos(TESTNET_ADDRESS);
    expect(result).toEqual([]);
  });

  it("filtre les dust outputs (value = 0)", async () => {
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => [
        utxo({ txid: "a".repeat(64), value: 100_000n }),
        utxo({ txid: "b".repeat(64), value: 0n }),
      ]),
    });
    const provider = new BitcoinUtxoProvider(rpc);
    const result = await provider.getUtxos(TESTNET_ADDRESS);
    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBe(100_000n);
  });

  it("filtre les txid invalides", async () => {
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => [
        utxo({ txid: "a".repeat(64), value: 100_000n }),
        utxo({ txid: "zzz", value: 100_000n }),
        utxo({ txid: "a".repeat(63), value: 100_000n }), // 63 hex
        utxo({ txid: "a".repeat(65), value: 100_000n }), // 65 hex
      ]),
    });
    const provider = new BitcoinUtxoProvider(rpc);
    const result = await provider.getUtxos(TESTNET_ADDRESS);
    expect(result).toHaveLength(1);
  });

  it("filtre les vout négatifs ou non-entiers", async () => {
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => [
        utxo({ txid: "a".repeat(64), value: 100_000n, vout: 0 }),
        utxo({ txid: "b".repeat(64), value: 100_000n, vout: -1 }),
        utxo({ txid: "c".repeat(64), value: 100_000n, vout: 1.5 }),
      ]),
    });
    const provider = new BitcoinUtxoProvider(rpc);
    const result = await provider.getUtxos(TESTNET_ADDRESS);
    expect(result).toHaveLength(1);
    expect(result[0]!.vout).toBe(0);
  });

  it("propage une erreur RPC", async () => {
    const rpc = mockBitcoinRpc({
      getUtxos: vi.fn(async () => {
        throw new Error("HTTP 500");
      }),
    });
    const provider = new BitcoinUtxoProvider(rpc);
    await expect(provider.getUtxos(TESTNET_ADDRESS)).rejects.toThrow("HTTP 500");
  });
});
