import { describe, expect, it } from "vitest";

import {
  formatBitcoin,
  isValidBitcoinAddress,
  parseBitcoin,
} from "./bitcoin";

/**
 * 🔒 isValidBitcoinAddress — validation P2WPKH stricte (E2.1.b.6.3)
 *
 * Vecteurs BIP-84 officiels (mnemonic "abandon…").
 */

const TB1Q_VALID = "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl";
const BC1Q_VALID = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu";
// Adresse valide au format mais checksum cassé (dernier char modifié).
const TB1Q_BAD_CHECKSUM = "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvka";
// P2WSH (32-byte program) → 62 chars, hors scope.
const P2WSH_62 =
  "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7";

describe("isValidBitcoinAddress", () => {
  it("accepte tb1q… valide sur testnet", () => {
    expect(isValidBitcoinAddress(TB1Q_VALID, "testnet")).toBe(true);
  });

  it("accepte bc1q… valide sur mainnet", () => {
    expect(isValidBitcoinAddress(BC1Q_VALID, "mainnet")).toBe(true);
  });

  it("rejette tb1q… valide sur mainnet (network mismatch)", () => {
    expect(isValidBitcoinAddress(TB1Q_VALID, "mainnet")).toBe(false);
  });

  it("rejette bc1q… valide sur testnet (network mismatch)", () => {
    expect(isValidBitcoinAddress(BC1Q_VALID, "testnet")).toBe(false);
  });

  it("rejette un checksum cassé", () => {
    expect(isValidBitcoinAddress(TB1Q_BAD_CHECKSUM, "testnet")).toBe(false);
  });

  it("rejette une adresse P2WSH 62 chars", () => {
    expect(isValidBitcoinAddress(P2WSH_62, "testnet")).toBe(false);
  });

  it("rejette une adresse legacy (1…)", () => {
    expect(isValidBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "mainnet")).toBe(false);
  });

  it("rejette une adresse P2SH (3…)", () => {
    expect(
      isValidBitcoinAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", "mainnet"),
    ).toBe(false);
  });

  it("rejette une adresse EVM (0x…)", () => {
    expect(
      isValidBitcoinAddress("0x" + "a".repeat(40), "mainnet"),
    ).toBe(false);
  });

  it("rejette une chaîne vide", () => {
    expect(isValidBitcoinAddress("", "testnet")).toBe(false);
  });

  it("rejette l'uppercase (bech32 lowercase only)", () => {
    expect(
      isValidBitcoinAddress(TB1Q_VALID.toUpperCase(), "testnet"),
    ).toBe(false);
  });
});

describe("formatBitcoin", () => {
  it("0 → '0'", () => {
    expect(formatBitcoin(0n)).toBe("0");
  });
  it("1 sat → '0.00000001'", () => {
    expect(formatBitcoin(1n)).toBe("0.00000001");
  });
  it("100M sats → '1'", () => {
    expect(formatBitcoin(100_000_000n)).toBe("1");
  });
  it("trim les zéros de queue", () => {
    expect(formatBitcoin(150_000_000n)).toBe("1.5");
  });
});

describe("parseBitcoin", () => {
  it("'1' → 100_000_000n", () => {
    expect(parseBitcoin("1")).toBe(100_000_000n);
  });
  it("'0.00000001' → 1n", () => {
    expect(parseBitcoin("0.00000001")).toBe(1n);
  });
  it("accepte ',' comme séparateur", () => {
    expect(parseBitcoin("1,5")).toBe(150_000_000n);
  });
  it("rejette > 8 décimales", () => {
    expect(() => parseBitcoin("0.000000001")).toThrow(/décimales/);
  });
  it("rejette négatif", () => {
    expect(() => parseBitcoin("-1")).toThrow(/négatif/);
  });
  it("rejette vide", () => {
    expect(() => parseBitcoin("")).toThrow(/vide/);
  });
});
