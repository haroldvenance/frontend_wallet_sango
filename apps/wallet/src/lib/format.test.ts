import { describe, expect, it } from "vitest";

import { formatSango, parseSango, shortenAddress, shortenHash } from "./format";

describe("formatSango", () => {
  it("formats whole SANGO", () => {
    expect(formatSango(10_000_000n)).toBe("1.0000000");
  });
  it("formats fractional", () => {
    expect(formatSango(12_345_678n)).toBe("1.2345678");
  });
  it("formats zero", () => {
    expect(formatSango(0n)).toBe("0.0000000");
  });
  it("accepts string input", () => {
    expect(formatSango("15000000")).toBe("1.5000000");
  });
});

describe("parseSango", () => {
  it("parses whole", () => {
    expect(parseSango("1")).toBe(10_000_000n);
  });
  it("parses fractional", () => {
    expect(parseSango("1.5")).toBe(15_000_000n);
  });
  it("parses 7 decimals", () => {
    expect(parseSango("0.0000001")).toBe(1n);
  });
  it("rejects too many decimals", () => {
    expect(() => parseSango("0.00000001")).toThrow();
  });
  it("rejects garbage", () => {
    expect(() => parseSango("abc")).toThrow();
  });
});

describe("shortenAddress", () => {
  it("shortens long address", () => {
    expect(shortenAddress("0x02291e07839d715a4c78b8585449b7e367aa01ab", 4)).toBe(
      "0x0229…01ab",
    );
  });
  it("leaves short address alone", () => {
    expect(shortenAddress("0xabcd", 4)).toBe("0xabcd");
  });
});

describe("shortenHash", () => {
  it("shortens hash", () => {
    expect(shortenHash("0x" + "a".repeat(64), 6)).toBe("0xaaaaaa…aaaaaa");
  });
});
