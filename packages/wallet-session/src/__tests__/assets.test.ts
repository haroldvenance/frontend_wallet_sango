import { describe, expect, it } from "vitest";
import { InMemoryAssetList, SANGO_NATIVE_ASSET } from "../assets";

describe("InMemoryAssetList", () => {
  it("register + get", () => {
    const a = new InMemoryAssetList();
    a.register(SANGO_NATIVE_ASSET);
    expect(a.get("sango")).toBe(SANGO_NATIVE_ASSET);
  });

  it("get() returns undefined for unknown", () => {
    const a = new InMemoryAssetList();
    expect(a.get("unknown")).toBeUndefined();
  });

  it("register() overwrites", () => {
    const a = new InMemoryAssetList();
    a.register(SANGO_NATIVE_ASSET);
    a.register({ ...SANGO_NATIVE_ASSET, symbol: "SANG" });
    expect(a.get("sango")!.symbol).toBe("SANG");
  });

  it("list() returns all registered", () => {
    const a = new InMemoryAssetList();
    a.register(SANGO_NATIVE_ASSET);
    a.register({ id: "usdt", symbol: "USDT", decimals: 6, kind: "token" });
    expect(a.list()).toHaveLength(2);
  });

  it("SANGO_NATIVE_ASSET has 7 decimals", () => {
    expect(SANGO_NATIVE_ASSET.decimals).toBe(7);
    expect(SANGO_NATIVE_ASSET.kind).toBe("native");
  });
});
