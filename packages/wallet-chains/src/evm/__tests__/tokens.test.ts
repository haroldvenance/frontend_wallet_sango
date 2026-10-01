import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import {
  EVM_TOKENS,
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

  it("tous les tokens USDC/USDT ont 6 décimales", () => {
    for (const networkId of Object.keys(EVM_TOKENS)) {
      for (const token of listTokensForNetwork(networkId)) {
        expect(token.decimals).toBe(6);
      }
    }
  });
});

describe("Helpers", () => {
  it("isKnownEvmNetwork", () => {
    expect(isKnownEvmNetwork("ethereum-mainnet")).toBe(true);
    expect(isKnownEvmNetwork("base")).toBe(true);
    expect(isKnownEvmNetwork("unknown")).toBe(false);
  });

  it("STABLECOIN_PARITY_USD = 1n (documenté)", () => {
    expect(STABLECOIN_PARITY_USD).toBe(1n);
  });

  it("snapshot : toutes les adresses figées", () => {
    const snapshot: Record<string, Record<string, string>> = {};
    for (const networkId of Object.keys(EVM_TOKENS).sort()) {
      snapshot[networkId] = {};
      for (const token of listTokensForNetwork(networkId)) {
        snapshot[networkId][token.symbol] = token.address;
      }
    }
    expect(snapshot).toMatchSnapshot("evm-tokens-addresses");
  });
});
