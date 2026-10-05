import { describe, expect, it, vi } from "vitest";
import { InMemoryChainRegistry, createChainRegistry } from "../chain-registry";
import type { ChainAdapter } from "../chain-adapter";
import type { Network } from "../../types/network";

// --- Fixtures --------------------------------------------------------------

function net(id: string, family: Network["family"] = "sango"): Network {
  return {
    id,
    family,
    name: id,
    chainId: "0x00",
    nativeAsset: "sango",
    isTestnet: true,
    defaultRpcEndpoints: ["http://127.0.0.1:8545"],
  };
}

function adapter(network: Network): ChainAdapter {
  // Adapter minimal pour test — les méthodes ne sont pas appelées ici.
  return {
    network,
    addressProvider: {} as ChainAdapter["addressProvider"],
    balanceProvider: {} as ChainAdapter["balanceProvider"],
    historyProvider: {} as ChainAdapter["historyProvider"],
  };
}

// --- Tests -----------------------------------------------------------------

describe("InMemoryChainRegistry", () => {
  it("registers and gets an adapter", () => {
    const r = createChainRegistry();
    const n = net("sango-devnet");
    r.register(n, adapter);
    const got = r.get("sango-devnet");
    expect(got).toBeDefined();
    expect(got!.network.id).toBe("sango-devnet");
  });

  it("get returns undefined for unknown network", () => {
    const r = createChainRegistry();
    expect(r.get("unknown")).toBeUndefined();
  });

  it("rejects duplicate registration", () => {
    const r = createChainRegistry();
    r.register(net("sango-devnet"), adapter);
    expect(() => r.register(net("sango-devnet"), adapter)).toThrow(
      /already registered/,
    );
  });

  it("is lazy: factory not called until get()", () => {
    const factory = vi.fn(adapter);
    const r = createChainRegistry();
    r.register(net("sango-devnet"), factory);
    expect(factory).not.toHaveBeenCalled();
    r.get("sango-devnet");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("caches the adapter (factory called once)", () => {
    const factory = vi.fn(adapter);
    const r = createChainRegistry();
    r.register(net("sango-devnet"), factory);
    const a = r.get("sango-devnet");
    const b = r.get("sango-devnet");
    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("list returns all registered networks in insertion order", () => {
    const r = createChainRegistry();
    r.register(net("sango-devnet"), adapter);
    r.register(net("sango-testnet"), adapter);
    const ids = r.list().map((n) => n.id);
    expect(ids).toEqual(["sango-devnet", "sango-testnet"]);
  });

  it("listByFamily filters", () => {
    const r = createChainRegistry();
    r.register(net("sango-devnet", "sango"), adapter);
    r.register(net("eth-mainnet", "evm"), adapter);
    r.register(net("sango-testnet", "sango"), adapter);

    const sangoOnly = r.listByFamily("sango").map((n) => n.id);
    expect(sangoOnly).toEqual(["sango-devnet", "sango-testnet"]);

    const evmOnly = r.listByFamily("evm").map((n) => n.id);
    expect(evmOnly).toEqual(["eth-mainnet"]);

    expect(r.listByFamily("bitcoin")).toEqual([]);
  });

  it("unregister removes network, factory, and cache", () => {
    const factory = vi.fn(adapter);
    const r = createChainRegistry();
    r.register(net("sango-devnet"), factory);
    r.get("sango-devnet"); // instancie + cache

    r.unregister("sango-devnet");

    expect(r.get("sango-devnet")).toBeUndefined();
    expect(r.list()).toEqual([]);

    // Une nouvelle inscription repart de zéro.
    r.register(net("sango-devnet"), factory);
    r.get("sango-devnet");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("createChainRegistry returns a fresh, independent registry", () => {
    const r1 = createChainRegistry();
    const r2 = createChainRegistry();
    r1.register(net("sango-devnet"), adapter);
    expect(r2.get("sango-devnet")).toBeUndefined();
  });

  it("two registries share nothing (instance check)", () => {
    expect(createChainRegistry()).toBeInstanceOf(InMemoryChainRegistry);
    expect(createChainRegistry()).not.toBe(createChainRegistry());
  });
});
