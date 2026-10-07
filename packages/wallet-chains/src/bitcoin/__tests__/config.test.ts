import { describe, expect, it } from "vitest";

import {
  ALL_BITCOIN_NETWORKS,
  BITCOIN_MAINNET,
  BITCOIN_TESTNET,
  bitcoinNetworkById,
} from "../config";

/**
 * 🔒 FROZEN — Configuration réseau Bitcoin (E2.1.b.7).
 *
 * Test explicite (pas de snapshot opaque). Une modification bénigne
 * d'une métadonnée n'invalide pas silencieusement le gel — elle
 * échoue avec un diff lisible.
 */

describe("🔒 ALL_BITCOIN_NETWORKS — ordre figé", () => {
  it("liste Testnet puis Mainnet", () => {
    expect(ALL_BITCOIN_NETWORKS.map((n) => n.id)).toEqual([
      "bitcoin-testnet",
      "bitcoin-mainnet",
    ]);
  });

  it("est figé (Object.freeze)", () => {
    expect(Object.isFrozen(ALL_BITCOIN_NETWORKS)).toBe(true);
  });

  it("family = 'bitcoin' pour tous", () => {
    for (const n of ALL_BITCOIN_NETWORKS) {
      expect(n.family).toBe("bitcoin");
    }
  });
});

describe("🔒 Bitcoin Testnet", () => {
  it("identité", () => {
    expect(BITCOIN_TESTNET.id).toBe("bitcoin-testnet");
    expect(BITCOIN_TESTNET.name).toBe("Bitcoin Testnet");
  });

  it("chainId = magic bytes testnet3 (0x0709110b)", () => {
    expect(BITCOIN_TESTNET.chainId).toBe("0x0709110b");
  });

  it("isTestnet = true", () => {
    expect(BITCOIN_TESTNET.isTestnet).toBe(true);
  });

  it("nativeAsset = 'btc'", () => {
    expect(BITCOIN_TESTNET.nativeAsset).toBe("btc");
  });

  it("endpoint mempool.space testnet", () => {
    expect(BITCOIN_TESTNET.defaultRpcEndpoints).toEqual([
      "https://mempool.space/testnet/api",
    ]);
  });

  it("explorer testnet", () => {
    expect(BITCOIN_TESTNET.explorer).toEqual({
      baseUrl: "https://mempool.space/testnet",
      txPath: "/tx/{hash}",
      addressPath: "/address/{addr}",
    });
  });
});

describe("🔒 Bitcoin Mainnet (E2.1.b.7)", () => {
  it("identité", () => {
    expect(BITCOIN_MAINNET.id).toBe("bitcoin-mainnet");
    expect(BITCOIN_MAINNET.name).toBe("Bitcoin");
  });

  it("chainId = magic bytes mainnet (0xd9b4bef9)", () => {
    expect(BITCOIN_MAINNET.chainId).toBe("0xd9b4bef9");
  });

  it("isTestnet = false", () => {
    expect(BITCOIN_MAINNET.isTestnet).toBe(false);
  });

  it("nativeAsset = 'btc' (même asset que testnet)", () => {
    expect(BITCOIN_MAINNET.nativeAsset).toBe("btc");
  });

  it("endpoint mempool.space mainnet (sans préfixe /testnet)", () => {
    expect(BITCOIN_MAINNET.defaultRpcEndpoints).toEqual([
      "https://mempool.space/api",
    ]);
  });

  it("explorer mainnet", () => {
    expect(BITCOIN_MAINNET.explorer).toEqual({
      baseUrl: "https://mempool.space",
      txPath: "/tx/{hash}",
      addressPath: "/address/{addr}",
    });
  });
});

describe("🔒 bitcoinNetworkById", () => {
  it("résout testnet", () => {
    expect(bitcoinNetworkById("bitcoin-testnet")).toBe(BITCOIN_TESTNET);
  });

  it("résout mainnet", () => {
    expect(bitcoinNetworkById("bitcoin-mainnet")).toBe(BITCOIN_MAINNET);
  });

  it("retourne undefined pour un id inconnu", () => {
    expect(bitcoinNetworkById("unknown")).toBeUndefined();
    expect(bitcoinNetworkById("bitcoin-signet")).toBeUndefined();
  });
});

describe("🔒 Invariants globaux", () => {
  it("chainId uniques", () => {
    const ids = ALL_BITCOIN_NETWORKS.map((n) => n.chainId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("network.id uniques", () => {
    const ids = ALL_BITCOIN_NETWORKS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("endpoints uniques", () => {
    const all = ALL_BITCOIN_NETWORKS.flatMap((n) => n.defaultRpcEndpoints);
    expect(new Set(all).size).toBe(all.length);
  });

  it("exactement 1 endpoint par réseau (mempool.space unique)", () => {
    for (const n of ALL_BITCOIN_NETWORKS) {
      expect(n.defaultRpcEndpoints).toHaveLength(1);
    }
  });
});
