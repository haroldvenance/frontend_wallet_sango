import { describe, expect, it } from "vitest";

import type { AggregatedTx } from "@/hooks/use-aggregated-history";

import { formatFee } from "./aggregated-row";

function tx(overrides: Partial<AggregatedTx> = {}): AggregatedTx {
  return {
    networkId: "ethereum-mainnet",
    txHash: "0xabc",
    source: "evm",
    timestamp: 1_700_000_000,
    blockHeight: 100,
    status: "confirmed",
    direction: "out",
    symbol: "ETH",
    amount: 0.5,
    fee: 0.00042,
    counterparty: null,
    contract: null,
    ...overrides,
  };
}

describe("formatFee", () => {
  it("EVM : retourne '<montant> ETH'", () => {
    const result = formatFee(
      tx({ source: "evm", fee: 0.00042, symbol: "ETH" }),
    );
    expect(result).toMatch(/0,00042/);
    expect(result).toMatch(/ETH$/);
  });

  it("Bitcoin : convertit en sats", () => {
    const result = formatFee(
      tx({ source: "bitcoin", fee: 0.00001234, symbol: "BTC" }),
    );
    // `toLocaleString("fr-FR")` utilise une espace fine insécable
    // (\u202f) comme séparateur de milliers. On matche par regex
    // pour ne pas dépendre du codepoint exact.
    expect(result).toMatch(/^1[\s\u202f\u00a0]234 sats$/);
  });

  it("Bitcoin : arrondit à l'entier de sat", () => {
    // 1234.7 sats → 1235 sats
    const result = formatFee(
      tx({ source: "bitcoin", fee: 0.000012347, symbol: "BTC" }),
    );
    expect(result).toMatch(/^1[\s\u202f\u00a0]235 sats$/);
  });

  it("null si fee est null", () => {
    expect(formatFee(tx({ fee: null }))).toBeNull();
  });

  it("null si fee = 0", () => {
    expect(formatFee(tx({ fee: 0 }))).toBeNull();
  });

  it("null pour SANGO (fee null)", () => {
    expect(
      formatFee(tx({ source: "sango", symbol: "SANGO", fee: null })),
    ).toBeNull();
  });

  it("Bitcoin : null si fee trop petit (< 0.5 sat)", () => {
    expect(
      formatFee(tx({ source: "bitcoin", fee: 0.000000001, symbol: "BTC" })),
    ).toBeNull();
  });
});
