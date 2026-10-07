import { describe, expect, it } from "vitest";

import { isKnownNetworkId, resolveChainFamily } from "./chain-family";

/**
 * 🔒 resolveChainFamily / isKnownNetworkId — E2.1.b.6.1
 *
 * Matrice stricte : chaque réseau connu → famille attendue.
 * Le fallback est `"sango"` — `isKnownNetworkId` est le check strict.
 */

describe("resolveChainFamily", () => {
  const EVM_CASES = [
    "ethereum-sepolia",
    "ethereum-mainnet",
    "base",
    "arbitrum-one",
    "bsc",
    "bsc-testnet",
  ] as const;

  it.each(EVM_CASES)("EVM : %s → evm", (networkId) => {
    expect(resolveChainFamily(networkId)).toBe("evm");
  });

  it("Bitcoin : bitcoin-testnet → bitcoin", () => {
    expect(resolveChainFamily("bitcoin-testnet")).toBe("bitcoin");
  });

  it.each(["sango-devnet", "sango-testnet", "sango-mainnet"])(
    "SANGO : %s → sango",
    (networkId) => {
      expect(resolveChainFamily(networkId)).toBe("sango");
    },
  );

  it("réseau inconnu → sango (fallback lenient)", () => {
    expect(resolveChainFamily("unknown-net")).toBe("sango");
    expect(resolveChainFamily("")).toBe("sango");
  });
});

describe("isKnownNetworkId", () => {
  it("EVM : 6 réseaux → true", () => {
    for (const id of [
      "ethereum-sepolia",
      "ethereum-mainnet",
      "base",
      "arbitrum-one",
      "bsc",
      "bsc-testnet",
    ]) {
      expect(isKnownNetworkId(id), id).toBe(true);
    }
  });

  it("Bitcoin : bitcoin-testnet → true", () => {
    expect(isKnownNetworkId("bitcoin-testnet")).toBe(true);
  });

  it("SANGO : préfixe sango- → true", () => {
    expect(isKnownNetworkId("sango-devnet")).toBe(true);
    expect(isKnownNetworkId("sango-testnet")).toBe(true);
    expect(isKnownNetworkId("sango-mainnet")).toBe(true);
  });

  it("inconnu → false", () => {
    expect(isKnownNetworkId("unknown-net")).toBe(false);
    expect(isKnownNetworkId("")).toBe(false);
    expect(isKnownNetworkId("ethereum")).toBe(false); // pas l'id canonique
  });
});
