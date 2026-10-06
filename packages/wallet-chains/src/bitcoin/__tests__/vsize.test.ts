import { describe, expect, it } from "vitest";

import {
  BITCOIN_DUST_LIMIT,
  estimateP2WPKHVsize,
} from "../vsize";

describe("estimateP2WPKHVsize", () => {
  it("1 input + 1 output = 10 + 68 + 31 = 109 vbytes", () => {
    expect(estimateP2WPKHVsize(1, 1)).toBe(109);
  });

  it("1 input + 2 outputs (avec change) = 10 + 68 + 62 = 140", () => {
    expect(estimateP2WPKHVsize(1, 2)).toBe(140);
  });

  it("3 inputs + 2 outputs = 10 + 204 + 62 = 276", () => {
    expect(estimateP2WPKHVsize(3, 2)).toBe(276);
  });

  it("rejette inputCount < 1", () => {
    expect(() => estimateP2WPKHVsize(0, 1)).toThrow(/inputCount/);
  });

  it("rejette outputCount < 1", () => {
    expect(() => estimateP2WPKHVsize(1, 0)).toThrow(/outputCount/);
  });

  it("rejette non-entier", () => {
    expect(() => estimateP2WPKHVsize(1.5, 1)).toThrow(/inputCount/);
    expect(() => estimateP2WPKHVsize(1, 1.5)).toThrow(/outputCount/);
  });
});

describe("BITCOIN_DUST_LIMIT", () => {
  it("294 sats (standard Bitcoin Core pour P2WPKH)", () => {
    expect(BITCOIN_DUST_LIMIT).toBe(294n);
  });
});
