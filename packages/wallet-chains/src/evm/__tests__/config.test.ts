import { describe, expect, it } from "vitest";

import {
  ALL_EVM_NETWORKS,
  ARBITRUM_ONE,
  BASE,
  BNB_SMART_CHAIN_MAINNET,
  BNB_SMART_CHAIN_TESTNET,
  ETHEREUM_MAINNET,
  ETHEREUM_SEPOLIA,
  evmNetworkById,
} from "../config";

/**
 * 🔒 FROZEN — Configuration réseau EVM.
 *
 * Test **explicite** (pas de snapshot opaque) : chaque champ critique
 * est asserté nommément. Une modification bénigne d'une métadonnée
 * n'invalide pas silencieusement le gel — elle échoue avec un diff
 * lisible.
 *
 * Modifier une valeur ci-dessous = revue obligatoire :
 *   - chainId faux → tx signée pour le mauvais réseau (fonds perdus)
 *   - nativeAsset faux → fees estimées dans le mauvais asset
 *   - RPC/explorer faux → fallback silencieux ou liens cassés
 */

describe("🔒 ALL_EVM_NETWORKS — ordre figé", () => {
  it("liste les 6 réseaux dans l'ordre UX", () => {
    expect(ALL_EVM_NETWORKS.map((n) => n.id)).toEqual([
      "ethereum-sepolia",
      "ethereum-mainnet",
      "base",
      "arbitrum-one",
      "bsc",
      "bsc-testnet",
    ]);
  });

  it("est figé (Object.freeze)", () => {
    expect(Object.isFrozen(ALL_EVM_NETWORKS)).toBe(true);
  });

  it("ne contient que family 'evm'", () => {
    for (const n of ALL_EVM_NETWORKS) {
      expect(n.family).toBe("evm");
    }
  });
});

describe("🔒 BNB Smart Chain mainnet", () => {
  it("identité", () => {
    expect(BNB_SMART_CHAIN_MAINNET.id).toBe("bsc");
    expect(BNB_SMART_CHAIN_MAINNET.family).toBe("evm");
    expect(BNB_SMART_CHAIN_MAINNET.name).toBe("BNB Smart Chain");
  });

  it("chainId 0x38 (= 56)", () => {
    expect(BNB_SMART_CHAIN_MAINNET.chainId).toBe("0x38");
    expect(Number.parseInt(BNB_SMART_CHAIN_MAINNET.chainId, 16)).toBe(56);
  });

  it("nativeAsset = 'bnb' (18 dec, pas 'eth')", () => {
    expect(BNB_SMART_CHAIN_MAINNET.nativeAsset).toBe("bnb");
  });

  it("3 endpoints RPC dans l'ordre de priorité", () => {
    expect(BNB_SMART_CHAIN_MAINNET.defaultRpcEndpoints).toEqual([
      "https://bsc-dataseed.binance.org",
      "https://bsc.publicnode.com",
      "https://bsc-rpc.publicnode.com",
    ]);
  });

  it("explorer BscScan mainnet", () => {
    expect(BNB_SMART_CHAIN_MAINNET.explorer).toEqual({
      baseUrl: "https://bscscan.com",
      txPath: "/tx/{hash}",
      addressPath: "/address/{addr}",
    });
  });
});

describe("🔒 BNB Smart Chain testnet (Chapel)", () => {
  it("identité", () => {
    expect(BNB_SMART_CHAIN_TESTNET.id).toBe("bsc-testnet");
    expect(BNB_SMART_CHAIN_TESTNET.family).toBe("evm");
    expect(BNB_SMART_CHAIN_TESTNET.name).toBe("BNB Smart Chain Testnet");
  });

  it("chainId 0x61 (= 97)", () => {
    expect(BNB_SMART_CHAIN_TESTNET.chainId).toBe("0x61");
    expect(Number.parseInt(BNB_SMART_CHAIN_TESTNET.chainId, 16)).toBe(97);
  });

  it("nativeAsset = 'bnb' (PAS 'tBNB', D-E1.7-2)", () => {
    expect(BNB_SMART_CHAIN_TESTNET.nativeAsset).toBe("bnb");
    expect(BNB_SMART_CHAIN_TESTNET.nativeAsset).not.toBe("tbnb");
    expect(BNB_SMART_CHAIN_TESTNET.nativeAsset).not.toBe("tBNB");
  });

  it("un seul endpoint RPC (seed officiel BNB Chain)", () => {
    expect(BNB_SMART_CHAIN_TESTNET.defaultRpcEndpoints).toEqual([
      "https://data-seed-prebsc-1-s1.binance.org:8545",
    ]);
  });

  it("explorer BscScan testnet", () => {
    expect(BNB_SMART_CHAIN_TESTNET.explorer).toEqual({
      baseUrl: "https://testnet.bscscan.com",
      txPath: "/tx/{hash}",
      addressPath: "/address/{addr}",
    });
  });
});

describe("🔒 Non-régression — réseaux existants inchangés", () => {
  it("Ethereum Sepolia", () => {
    expect(ETHEREUM_SEPOLIA.id).toBe("ethereum-sepolia");
    expect(ETHEREUM_SEPOLIA.chainId).toBe("0xaa36a7");
    expect(ETHEREUM_SEPOLIA.nativeAsset).toBe("eth");
  });

  it("Ethereum Mainnet", () => {
    expect(ETHEREUM_MAINNET.id).toBe("ethereum-mainnet");
    expect(ETHEREUM_MAINNET.chainId).toBe("0x1");
    expect(ETHEREUM_MAINNET.nativeAsset).toBe("eth");
  });

  it("Base", () => {
    expect(BASE.id).toBe("base");
    expect(BASE.chainId).toBe("0x2105");
    expect(BASE.nativeAsset).toBe("eth");
  });

  it("Arbitrum One", () => {
    expect(ARBITRUM_ONE.id).toBe("arbitrum-one");
    expect(ARBITRUM_ONE.chainId).toBe("0xa4b1");
    expect(ARBITRUM_ONE.nativeAsset).toBe("eth");
  });
});

describe("🔒 EvmNetworkById — résolution", () => {
  it("résout les 6 réseaux par id", () => {
    for (const n of ALL_EVM_NETWORKS) {
      expect(evmNetworkById(n.id)).toBe(n);
    }
  });

  it("résout 'bsc' → BNB_SMART_CHAIN_MAINNET", () => {
    expect(evmNetworkById("bsc")).toBe(BNB_SMART_CHAIN_MAINNET);
  });

  it("résout 'bsc-testnet' → BNB_SMART_CHAIN_TESTNET", () => {
    expect(evmNetworkById("bsc-testnet")).toBe(BNB_SMART_CHAIN_TESTNET);
  });

  it("retourne undefined pour un id inconnu", () => {
    expect(evmNetworkById("unknown-net")).toBeUndefined();
    expect(evmNetworkById("binance-smart-chain")).toBeUndefined();
  });
});

describe("🔒 Invariants globaux", () => {
  it("tous les chainId sont uniques", () => {
    const ids = ALL_EVM_NETWORKS.map((n) => Number.parseInt(n.chainId, 16));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tous les network.id sont uniques", () => {
    const ids = ALL_EVM_NETWORKS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("aucun endpoint RPC en doublon inter-réseaux", () => {
    const all = ALL_EVM_NETWORKS.flatMap((n) => n.defaultRpcEndpoints);
    expect(new Set(all).size).toBe(all.length);
  });

  it("au moins un endpoint RPC par réseau", () => {
    for (const n of ALL_EVM_NETWORKS) {
      expect(n.defaultRpcEndpoints.length).toBeGreaterThan(0);
    }
  });
});
