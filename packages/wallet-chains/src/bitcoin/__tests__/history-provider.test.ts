import { describe, expect, it, vi } from "vitest";

import { BitcoinHistoryProvider } from "../history-provider";
import type { BitcoinRpc, EsploraTx, Utxo } from "../rpc";

const ADDRESS = "tb1qme";
const OTHER = "tb1qother";

function makeRpc(txs: EsploraTx[]): BitcoinRpc {
  return {
    getUtxos: vi.fn(async (): Promise<readonly Utxo[]> => []),
    getFeeRates: vi.fn(async () => ({ fast: 1n, normal: 1n, slow: 1n })),
    broadcastTx: vi.fn(async () => ""),
    getTxs: vi.fn(async () => txs),
  };
}

function makeTx(overrides: Partial<EsploraTx>): EsploraTx {
  return {
    txid: "aa".repeat(32),
    version: 2,
    locktime: 0,
    vin: [],
    vout: [],
    size: 200,
    weight: 600,
    fee: 100,
    status: { confirmed: true, block_height: 100, block_time: 1_700_000_000 },
    ...overrides,
  };
}

describe("BitcoinHistoryProvider — Patch A.2", () => {
  it("reçue : delta > 0 → from=counterparty, to=address", async () => {
    const tx = makeTx({
      vin: [
        {
          txid: "bb".repeat(32),
          vout: 0,
          prevout: {
            scriptpubkey: "",
            scriptpubkey_address: OTHER,
            value: 100_000,
          },
          is_coinbase: false,
        },
      ],
      vout: [
        { scriptpubkey: "", scriptpubkey_address: ADDRESS, value: 90_000 },
        { scriptpubkey: "", scriptpubkey_address: OTHER, value: 9_000 },
      ],
    });

    const provider = new BitcoinHistoryProvider(makeRpc([tx]), "bitcoin-testnet");
    const result = await provider.getHistory({ address: ADDRESS, limit: 20 });

    expect(result.items).toHaveLength(1);
    const item = result.items[0]!;
    expect(item.from).toBe(OTHER);
    expect(item.to).toBe(ADDRESS);
    expect(item.amount).toBe(90_000n);
    expect(item.status).toBe("confirmed");
    expect(item.timestamp).toBe(1_700_000_000);
    expect(item.blockHeight).toBe(100);
  });

  it("envoyée : delta < 0 → from=address, to=counterparty", async () => {
    const tx = makeTx({
      vin: [
        {
          txid: "bb".repeat(32),
          vout: 0,
          prevout: {
            scriptpubkey: "",
            scriptpubkey_address: ADDRESS,
            value: 100_000,
          },
          is_coinbase: false,
        },
      ],
      vout: [
        { scriptpubkey: "", scriptpubkey_address: OTHER, value: 80_000 },
        { scriptpubkey: "", scriptpubkey_address: ADDRESS, value: 19_000 },
      ],
    });

    const provider = new BitcoinHistoryProvider(makeRpc([tx]), "bitcoin-testnet");
    const { items } = await provider.getHistory({ address: ADDRESS, limit: 20 });

    expect(items[0]!.from).toBe(ADDRESS);
    expect(items[0]!.to).toBe(OTHER);
    // delta = 19_000 - 100_000 = -81_000 (target 80_000 + fees 1_000).
    // Le montant affiché est abs(delta), fees incluses.
    expect(items[0]!.amount).toBe(81_000n);
  });

  it("delta = 0 strict → from=to=address, amount=0 (D7·A)", async () => {
    // Cas théorique : input et output compensent exactement, aucun
    // frais. Impossible on-chain (fees > 0) mais utile pour figer la
    // règle "delta = 0 strict → Interne".
    const tx = makeTx({
      vin: [
        {
          txid: "bb".repeat(32),
          vout: 0,
          prevout: {
            scriptpubkey: "",
            scriptpubkey_address: ADDRESS,
            value: 50_000,
          },
          is_coinbase: false,
        },
      ],
      vout: [
        { scriptpubkey: "", scriptpubkey_address: ADDRESS, value: 50_000 },
      ],
    });

    const provider = new BitcoinHistoryProvider(makeRpc([tx]), "bitcoin-testnet");
    const { items } = await provider.getHistory({ address: ADDRESS, limit: 20 });

    expect(items[0]!.from).toBe(ADDRESS);
    expect(items[0]!.to).toBe(ADDRESS);
    expect(items[0]!.amount).toBe(0n);
  });

  it("self-transfer avec fees → Envoyée (delta ≠ 0)", async () => {
    // Cas réaliste : auto-send 49 000 sur 50 000, frais 1 000.
    // delta = -1 000 → classé Envoyée, amount = 1 000 (les frais).
    const tx = makeTx({
      vin: [
        {
          txid: "bb".repeat(32),
          vout: 0,
          prevout: {
            scriptpubkey: "",
            scriptpubkey_address: ADDRESS,
            value: 50_000,
          },
          is_coinbase: false,
        },
      ],
      vout: [
        { scriptpubkey: "", scriptpubkey_address: ADDRESS, value: 49_000 },
      ],
    });

    const provider = new BitcoinHistoryProvider(makeRpc([tx]), "bitcoin-testnet");
    const { items } = await provider.getHistory({ address: ADDRESS, limit: 20 });

    expect(items[0]!.from).toBe(ADDRESS);
    // Pas de contrepartie identifiable (tous les vout/vin sont nous).
    // L'UI classera Envoyée car `to !== myAddress`.
    expect(items[0]!.to).toBe("");
    expect(items[0]!.amount).toBe(1_000n);
  });

  it("pending : timestamp et blockHeight absents (D9·A)", async () => {
    const tx = makeTx({
      status: { confirmed: false },
      vin: [
        {
          txid: "bb".repeat(32),
          vout: 0,
          prevout: {
            scriptpubkey: "",
            scriptpubkey_address: OTHER,
            value: 100_000,
          },
          is_coinbase: false,
        },
      ],
      vout: [
        { scriptpubkey: "", scriptpubkey_address: ADDRESS, value: 90_000 },
      ],
    });

    const provider = new BitcoinHistoryProvider(makeRpc([tx]), "bitcoin-testnet");
    const { items } = await provider.getHistory({ address: ADDRESS, limit: 20 });

    expect(items[0]!.status).toBe("pending");
    expect(items[0]!.timestamp).toBeUndefined();
    expect(items[0]!.blockHeight).toBeUndefined();
  });

  it("tronque à 20 (D10·A) même si Esplora en fournit 50", async () => {
    const txs = Array.from({ length: 50 }, (_, i) =>
      makeTx({
        txid: i.toString(16).padStart(64, "0"),
        vin: [
          {
            txid: "bb".repeat(32),
            vout: 0,
            prevout: {
              scriptpubkey: "",
              scriptpubkey_address: OTHER,
              value: 100_000,
            },
            is_coinbase: false,
          },
        ],
        vout: [
          { scriptpubkey: "", scriptpubkey_address: ADDRESS, value: 90_000 },
        ],
      }),
    );

    const provider = new BitcoinHistoryProvider(makeRpc(txs), "bitcoin-testnet");
    const { items, total } = await provider.getHistory({
      address: ADDRESS,
      limit: 20,
    });

    expect(items).toHaveLength(20);
    expect(total).toBe(20);
  });

  it("assetRef = natif btc (D4·A)", async () => {
    const tx = makeTx({
      vin: [],
      vout: [
        { scriptpubkey: "", scriptpubkey_address: ADDRESS, value: 1_000 },
      ],
    });

    const provider = new BitcoinHistoryProvider(makeRpc([tx]), "bitcoin-testnet");
    const { items } = await provider.getHistory({ address: ADDRESS, limit: 20 });

    expect(items[0]!.assetRef).toEqual({
      kind: "native",
      assetId: "btc",
      networkId: "bitcoin-testnet",
    });
  });
});
