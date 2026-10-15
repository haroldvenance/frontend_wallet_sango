import { describe, expect, it } from "vitest";

import {
  resolveEvmRpcEndpoint,
  resolveEvmRpcEndpoints,
} from "./resolve-evm-rpc";

const DEFAULTS = ["https://a.example", "https://b.example"];

describe("resolveEvmRpcEndpoints", () => {
  it("custom présent → un seul endpoint priority 0", () => {
    const r = resolveEvmRpcEndpoints("eth", DEFAULTS, {
      eth: "https://custom.example",
    });
    expect(r).toEqual([{ url: "https://custom.example", priority: 0 }]);
  });

  it("custom absent → presets priorités", () => {
    const r = resolveEvmRpcEndpoints("eth", DEFAULTS, {});
    expect(r).toEqual([
      { url: "https://a.example", priority: 0 },
      { url: "https://b.example", priority: 1 },
    ]);
  });

  it("custom pour autre network → presets appliqués", () => {
    const r = resolveEvmRpcEndpoints("eth", DEFAULTS, {
      base: "https://x.example",
    });
    expect(r[0]).toEqual({ url: "https://a.example", priority: 0 });
  });

  it("custom vide → presets (pas de fallback sur chaîne vide)", () => {
    const r = resolveEvmRpcEndpoints("eth", DEFAULTS, { eth: "" });
    expect(r[0]).toEqual({ url: "https://a.example", priority: 0 });
  });
});

describe("resolveEvmRpcEndpoint", () => {
  it("custom présent → custom", () => {
    expect(
      resolveEvmRpcEndpoint("eth", DEFAULTS, { eth: "https://c.example" }),
    ).toBe("https://c.example");
  });

  it("custom absent → default[0]", () => {
    expect(resolveEvmRpcEndpoint("eth", DEFAULTS, {})).toBe(
      "https://a.example",
    );
  });

  it("defaults undefined → ''", () => {
    expect(resolveEvmRpcEndpoint("eth", undefined, {})).toBe("");
  });
});
