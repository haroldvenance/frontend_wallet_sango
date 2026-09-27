import { describe, expect, it } from "vitest";

import { formatSango, parseSango, shortenAddress, shortenHash } from "./format";

describe("formatSango", () => {
  it("trims trailing zeros for whole SANGO", () => {
    expect(formatSango(10_000_000n)).toBe("1");
    expect(formatSango(100_000_000_000n)).toBe("10000");
  });

  it("formats zero", () => {
    expect(formatSango(0n)).toBe("0");
  });

  it("accepts string input", () => {
    expect(formatSango("15000000")).toBe("1.5");
    expect(formatSango("1000000000")).toBe("100");
  });

  it("keeps significant decimals", () => {
    expect(formatSango(10_000_001n)).toBe("1.0000001");
    expect(formatSango(15_000_000n)).toBe("1.5");
    expect(formatSango(15_123_456n)).toBe("1.5123456");
  });

  it("handles negative values", () => {
    expect(formatSango(-10_000_000n)).toBe("-1");
    expect(formatSango(-15_500_000n)).toBe("-1.55");
  });
});

describe("parseSango", () => {
  it("parses whole SANGO", () => {
    expect(parseSango("1")).toBe(10_000_000n);
    expect(parseSango("100")).toBe(1_000_000_000n);
  });

  it("parses fractional", () => {
    expect(parseSango("1.5")).toBe(15_000_000n);
    expect(parseSango("0.0000001")).toBe(1n);
  });

  it("rejects too many decimals", () => {
    expect(() => parseSango("1.00000001")).toThrow();
  });

  it("rejects invalid input", () => {
    expect(() => parseSango("abc")).toThrow();
    expect(() => parseSango("")).toThrow();
  });
});

describe("shortenAddress", () => {
  it("returns short strings unchanged", () => {
    expect(shortenAddress("0x1234")).toBe("0x1234");
    expect(shortenAddress("abc")).toBe("abc");
    expect(shortenAddress("")).toBe("");
  });

  it("shortens long addresses", () => {
    const addr = "0x" + "a".repeat(40);
    const short = shortenAddress(addr);
    expect(short.length).toBeLessThan(addr.length);
    // Doit garder le préfixe 0x
    expect(short.startsWith("0x")).toBe(true);
  });

  it("respects custom char count", () => {
    const addr = "0x" + "a".repeat(40);
    const s4 = shortenAddress(addr, 4);
    const s6 = shortenAddress(addr, 6);
    // Plus on garde de chars, plus le résultat est long
    expect(s6.length).toBeGreaterThan(s4.length);
  });
});

describe("shortenHash", () => {
  it("returns short strings unchanged", () => {
    expect(shortenHash("0x1234")).toBe("0x1234");
    expect(shortenHash("abc")).toBe("abc");
  });

  it("shortens long hashes", () => {
    const h = "0x" + "b".repeat(64);
    const short = shortenHash(h);
    expect(short.length).toBeLessThan(h.length);
    expect(short.startsWith("0x")).toBe(true);
  });
});
