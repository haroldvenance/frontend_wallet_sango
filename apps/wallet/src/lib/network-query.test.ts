import { describe, expect, it } from "vitest";
import { networkQueryKey } from "./network-query";

describe("networkQueryKey", () => {
  it("places endpoint and networkId after the base", () => {
    expect(networkQueryKey(["account"], "http://x", "sango-devnet")).toEqual([
      "account",
      "http://x",
      "sango-devnet",
    ]);
  });

  it("appends extra params after networkId", () => {
    expect(
      networkQueryKey(["account"], "http://x", "sango-devnet", "0xabc"),
    ).toEqual(["account", "http://x", "sango-devnet", "0xabc"]);
  });

  it("supports multiple extras", () => {
    expect(
      networkQueryKey(["txs"], "http://x", "sango-devnet", "0xabc", 20, 0),
    ).toEqual(["txs", "http://x", "sango-devnet", "0xabc", 20, 0]);
  });

  it("returns a new array each call", () => {
    const a = networkQueryKey(["x"], "e", "n");
    const b = networkQueryKey(["x"], "e", "n");
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("does not mutate the base array", () => {
    const base = ["account"];
    networkQueryKey(base, "e", "n");
    expect(base).toEqual(["account"]);
  });
});
