import { beforeEach, describe, expect, it } from "vitest";

import { useEvmRpcStore } from "./evm-rpc-store";

beforeEach(() => {
  useEvmRpcStore.setState({ customEndpoints: {} });
  localStorage.clear();
});

describe("evm-rpc-store", () => {
  it("setCustomEndpoint ajoute l'entrée", () => {
    useEvmRpcStore.getState().setCustomEndpoint("ethereum-mainnet", "https://rpc.example");
    expect(useEvmRpcStore.getState().customEndpoints["ethereum-mainnet"]).toBe("https://rpc.example");
  });

  it("setCustomEndpoint overwrite sans dupliquer", () => {
    useEvmRpcStore.getState().setCustomEndpoint("base", "https://a.example");
    useEvmRpcStore.getState().setCustomEndpoint("base", "https://b.example");
    expect(useEvmRpcStore.getState().customEndpoints["base"]).toBe("https://b.example");
    expect(Object.keys(useEvmRpcStore.getState().customEndpoints)).toHaveLength(1);
  });

  it("clearCustomEndpoint supprime l'entrée ciblée", () => {
    useEvmRpcStore.getState().setCustomEndpoint("base", "https://a.example");
    useEvmRpcStore.getState().setCustomEndpoint("bsc", "https://b.example");
    useEvmRpcStore.getState().clearCustomEndpoint("base");
    expect(useEvmRpcStore.getState().customEndpoints["base"]).toBeUndefined();
    expect(useEvmRpcStore.getState().customEndpoints["bsc"]).toBe("https://b.example");
  });

  it("clearCustomEndpoint idempotent", () => {
    expect(() => useEvmRpcStore.getState().clearCustomEndpoint("nonexistent")).not.toThrow();
  });
});
