import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import {
  EVM_TOKENS,
  MAX_UINT256,
  STABLECOIN_PARITY_USD,
  getTokenConfig,
  isKnownEvmNetwork,
  listTokensForNetwork,
} from "../tokens";

/**
 * 🔒 FROZEN — Adresses ERC-20 officielles.
 *
 * Toute divergence doit être traitée comme un BUG : une adresse
 * erronée peut rediriger des fonds vers un contrat inconnu.
 *
 * Pour modifier une adresse :
 *   1. Vérifier sur la source officielle (Circle / Tether)
 *   2. Mettre à jour `EVM_TOKENS` avec la nouvelle adresse + source
 *   3. Mettre à jour le snapshot ci-dessous (justification obligatoire)
 *   4. Vérifier le checksum EIP-55 (test présent plus bas)
 */

describe("🔒 EVM_TOKENS — frozen addresses", () => {
  it("USDC Ethereum Mainnet", () => {
    const t = getTokenConfig("ethereum-mainnet", "USDC");
    expect(t).toBeDefined();
    expect(t!.address.toLowerCase()).toBe(
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );
    expect(t!.decimals).toBe(6);
  });

  it("USDC Arbitrum One", () => {
    const t = getTokenConfig("arbitrum-one", "USDC");
    expect(t).toBeDefined();
    expect(t!.address.toLowerCase()).toBe(
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    );
  });

  it("USDC Base", () => {
    const t = getTokenConfig("base", "USDC");
    expect(t).toBeDefined();
    expect(t!.address.toLowerCase()).toBe(
      "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    );
  });

  it("USDC Ethereum Sepolia", () => {
    const t = getTokenConfig("ethereum-sepolia", "USDC");
    expect(t).toBeDefined();
    expect(t!.address.toLowerCase()).toBe(
      "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    );
  });

  it("USDT Ethereum Mainnet", () => {
    const t = getTokenConfig("ethereum-mainnet", "USDT");
    expect(t).toBeDefined();
    expect(t!.address.toLowerCase()).toBe(
      "0xdac17f958d2ee523a2206206994597c13d831ec7",
    );
    expect(t!.decimals).toBe(6);
  });

  it("USDT Arbitrum One (source à revérifier)", () => {
    const t = getTokenConfig("arbitrum-one", "USDT");
    expect(t).toBeDefined();
    expect(t!.address.toLowerCase()).toBe(
      "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    );
  });

  // 🔒 USDT BSC — D-E1.7-3
  // Le piège : copier-coller l'adresse Ethereum/Arbitrum (0xdAC1… /
  // 0xFd08…) ou garder decimals: 6 par analogie. Les 4 propriétés
  // doivent être validées ENSEMBLE pour bloquer ce type d'erreur.
  it("USDT BSC mainnet — 4 propriétés couplées (anti copy-paste)", () => {
    const t = getTokenConfig("bsc", "USDT");
    expect(t).toBeDefined();
    expect({
      network: "bsc",
      symbol: t!.symbol,
      decimals: t!.decimals,
      name: t!.name,
      addressLower: t!.address.toLowerCase(),
    }).toEqual({
      network: "bsc",
      symbol: "USDT",
      decimals: 18,
      name: "Binance-Peg BSC-USD",
      addressLower: "0x55d398326f99059ff775485246999027b3197955",
    });
  });

  it("USDT BSC n'est PAS de l'USDT Ethereum/Arbitrum (adresses distinctes)", () => {
    const bsc = getTokenConfig("bsc", "USDT")!;
    const eth = getTokenConfig("ethereum-mainnet", "USDT")!;
    const arb = getTokenConfig("arbitrum-one", "USDT")!;
    expect(bsc.address.toLowerCase()).not.toBe(eth.address.toLowerCase());
    expect(bsc.address.toLowerCase()).not.toBe(arb.address.toLowerCase());
    expect(bsc.decimals).not.toBe(eth.decimals);
    expect(bsc.decimals).not.toBe(arb.decimals);
  });

  it("USDT BSC : checksum EIP-55 préservé", () => {
    const t = getTokenConfig("bsc", "USDT")!;
    // Doit être stocké avec le checksum mixte, pas en lowercase brut.
    expect(t.address).toBe("0x55d398326f99059fF775485246999027B3197955");
  });

  // 🔒 USDT BSC Testnet — E1.7.d
  it("USDT BSC Testnet — 5 propriétés couplées (anti copy-paste)", () => {
    const t = getTokenConfig("bsc-testnet", "USDT");
    expect(t).toBeDefined();
    expect({
      network: "bsc-testnet",
      symbol: t!.symbol,
      decimals: t!.decimals,
      name: t!.name,
      addressLower: t!.address.toLowerCase(),
    }).toEqual({
      network: "bsc-testnet",
      symbol: "USDT",
      decimals: 18,
      name: "USDT (BSC Testnet)",
      addressLower: "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd",
    });
  });

  it("USDT BSC Testnet n'est PAS l'adresse mainnet (anti copy-paste)", () => {
    const mainnet = getTokenConfig("bsc", "USDT")!;
    const testnet = getTokenConfig("bsc-testnet", "USDT")!;
    expect(testnet.address.toLowerCase()).not.toBe(
      mainnet.address.toLowerCase(),
    );
    // Le nom doit distinguer explicitement testnet / mainnet.
    expect(testnet.name).not.toBe(mainnet.name);
    expect(testnet.name).toContain("Testnet");
  });

  it("USDT BSC Testnet : checksum EIP-55 préservé", () => {
    const t = getTokenConfig("bsc-testnet", "USDT")!;
    expect(t.address).toBe("0x337610d27c682E347C9cD60BD4b3b107C9d34dDd");
  });
});

describe("EVM_TOKENS — disponibilité par réseau", () => {
  it("Ethereum Mainnet : USDC + USDT", () => {
    expect(listTokensForNetwork("ethereum-mainnet").map((t) => t.symbol).sort()).toEqual([
      "USDC",
      "USDT",
    ]);
  });

  it("Arbitrum One : USDC + USDT", () => {
    expect(listTokensForNetwork("arbitrum-one").map((t) => t.symbol).sort()).toEqual([
      "USDC",
      "USDT",
    ]);
  });

  it("Base : USDC uniquement (pas de USDT)", () => {
    expect(listTokensForNetwork("base").map((t) => t.symbol)).toEqual(["USDC"]);
    expect(getTokenConfig("base", "USDT")).toBeUndefined();
  });

  it("Sepolia : USDC uniquement (pas de USDT)", () => {
    expect(listTokensForNetwork("ethereum-sepolia").map((t) => t.symbol)).toEqual([
      "USDC",
    ]);
    expect(getTokenConfig("ethereum-sepolia", "USDT")).toBeUndefined();
  });

  it("BSC : USDT uniquement (pas de USDC — D-E1.6-7 étendue)", () => {
    expect(listTokensForNetwork("bsc").map((t) => t.symbol)).toEqual(["USDT"]);
    expect(getTokenConfig("bsc", "USDC")).toBeUndefined();
  });

  it("BSC Testnet : USDT uniquement (E1.7.d)", () => {
    expect(listTokensForNetwork("bsc-testnet").map((t) => t.symbol)).toEqual([
      "USDT",
    ]);
    expect(getTokenConfig("bsc-testnet", "USDT")).toBeDefined();
    expect(getTokenConfig("bsc-testnet", "USDC")).toBeUndefined();
  });

  it("réseau inconnu : liste vide", () => {
    expect(listTokensForNetwork("unknown-net")).toEqual([]);
    expect(getTokenConfig("unknown-net", "USDC")).toBeUndefined();
  });
});

describe("EVM_TOKENS — intégrité des adresses", () => {
  it("toutes les adresses sont des adresses EVM valides (checksum EIP-55)", () => {
    for (const networkId of Object.keys(EVM_TOKENS)) {
      for (const token of listTokensForNetwork(networkId)) {
        // `getAddress` valide le checksum EIP-55 et lance si invalide.
        // On ne s'attend PAS à ce que le format exact de la config
        // soit checksummé — on veut juste que la valeur soit
        // convertible en adresse canonique.
        const canonical = getAddress(token.address);
        expect(canonical).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(canonical.toLowerCase()).toBe(token.address.toLowerCase());
      }
    }
  });

  it("tous les tokens ont une source non vide", () => {
    for (const networkId of Object.keys(EVM_TOKENS)) {
      for (const token of listTokensForNetwork(networkId)) {
        expect(token.source.length).toBeGreaterThan(10);
      }
    }
  });

  it("USDT BSC a 18 décimales, les autres tokens 6 (D-E1.7-3)", () => {
    // Test explicite par token — plus de boucle "tout à 6".
    // Voir le test frozen USDT BSC pour l'ensemble des 4 propriétés.
    expect(getTokenConfig("ethereum-mainnet", "USDC")!.decimals).toBe(6);
    expect(getTokenConfig("ethereum-mainnet", "USDT")!.decimals).toBe(6);
    expect(getTokenConfig("arbitrum-one", "USDC")!.decimals).toBe(6);
    expect(getTokenConfig("arbitrum-one", "USDT")!.decimals).toBe(6);
    expect(getTokenConfig("base", "USDC")!.decimals).toBe(6);
    expect(getTokenConfig("ethereum-sepolia", "USDC")!.decimals).toBe(6);
    expect(getTokenConfig("bsc", "USDT")!.decimals).toBe(18);
  });
});

describe("Helpers", () => {
  it("isKnownEvmNetwork", () => {
    expect(isKnownEvmNetwork("ethereum-mainnet")).toBe(true);
    expect(isKnownEvmNetwork("base")).toBe(true);
    expect(isKnownEvmNetwork("bsc")).toBe(true);
    expect(isKnownEvmNetwork("bsc-testnet")).toBe(true);
    expect(isKnownEvmNetwork("unknown")).toBe(false);
  });

  it("STABLECOIN_PARITY_USD = 1n (documenté)", () => {
    expect(STABLECOIN_PARITY_USD).toBe(1n);
  });

  it("MAX_UINT256 = 2^256 - 1 (E2.2.a.1, approve illimité)", () => {
    expect(MAX_UINT256).toBe((1n << 256n) - 1n);
    // Sanity checks : positif, > tout montant plausible de token.
    expect(MAX_UINT256).toBeGreaterThan(0n);
    expect(MAX_UINT256).toBeGreaterThan(10n ** 40n);
  });

  /**
   * 🔒 Table explicite des adresses gelées (E1.7.g.3).
   *
   * **D-E1.7-12** : remplace l'ancien snapshot Vitest. Un snapshot est
   * opaque dans le diff (`toMatchSnapshot` produit une ligne "1
   * updated"), ce qui rend un ajout de réseau difficile à reviewer.
   * Une table explicite produit un diff lisible ligne-à-ligne.
   *
   * Modifier une entrée = décision documentée :
   *   1. Vérifier la source officielle (Circle / Tether / BscScan)
   *   2. Mettre à jour `EVM_TOKENS` avec `source` explicite
   *   3. Mettre à jour la table ci-dessous (justification en commit)
   *   4. Vérifier le frozen test correspondant plus haut
   */
  const FROZEN_EVM_TOKEN_ADDRESSES: Readonly<
    Record<string, Readonly<Record<string, string>>>
  > = {
    "ethereum-mainnet": {
      USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    },
    "arbitrum-one": {
      USDC: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      USDT: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    },
    base: {
      USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    },
    "ethereum-sepolia": {
      USDC: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    },
    bsc: {
      USDT: "0x55d398326f99059ff775485246999027b3197955",
    },
    "bsc-testnet": {
      USDT: "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd",
    },
  };

  it("🔒 adresses figées (table explicite, diff lisible)", () => {
    const actual: Record<string, Record<string, string>> = {};
    for (const networkId of Object.keys(EVM_TOKENS).sort()) {
      actual[networkId] = {};
      for (const token of listTokensForNetwork(networkId)) {
        actual[networkId][token.symbol] = token.address.toLowerCase();
      }
    }
    expect(actual).toEqual(FROZEN_EVM_TOKEN_ADDRESSES);
  });

  it("🔒 aucun réseau/token orphelin dans la table", () => {
    // Réciproque : chaque entrée de la table DOIT correspondre à un
    // token présent dans EVM_TOKENS. Empêche les entrées fantômes.
    for (const [networkId, symbols] of Object.entries(
      FROZEN_EVM_TOKEN_ADDRESSES,
    )) {
      for (const symbol of Object.keys(symbols)) {
        const cfg = getTokenConfig(
          networkId,
          symbol as Parameters<typeof getTokenConfig>[1],
        );
        expect(
          cfg,
          `${networkId}/${symbol} attendu dans EVM_TOKENS`,
        ).toBeDefined();
      }
    }
  });
});
