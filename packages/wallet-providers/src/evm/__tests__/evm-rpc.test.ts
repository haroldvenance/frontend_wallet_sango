import { describe, expect, it, vi } from "vitest";

import { EvmRpcUsingPool } from "../evm-rpc";
import { HttpRpcPool } from "../../rpc/rpc-pool";
import type { RpcPool } from "../../rpc/rpc-pool";

const ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

/** Pool mock simple : enregistre les appels, retourne `results[method]`. */
function mockPool(
  results: Record<string, unknown>,
): RpcPool & { calls: Array<{ method: string; params: readonly unknown[] }> } {
  const calls: Array<{ method: string; params: readonly unknown[] }> = [];
  return {
    calls,
    register: vi.fn(),
    request: vi.fn(async (_networkId, method, params = []) => {
      calls.push({ method, params });
      if (!(method in results)) {
        throw new Error(`mockPool: no result for ${method}`);
      }
      return results[method];
    }),
  } as unknown as RpcPool & {
    calls: Array<{ method: string; params: readonly unknown[] }>;
  };
}

describe("EvmRpcUsingPool", () => {
  it("getChainId parses hex → number", async () => {
    const pool = mockPool({ eth_chainId: "0xaa36a7" }); // 11155111
    const rpc = new EvmRpcUsingPool(pool, "eth");
    expect(await rpc.getChainId()).toBe(11155111);
    expect(pool.calls[0]).toEqual({ method: "eth_chainId", params: [] });
  });

  it("getBalance parses hex → bigint and uses 'latest'", async () => {
    const pool = mockPool({ eth_getBalance: "0xde0b6b3a7640000" }); // 1 ETH
    const rpc = new EvmRpcUsingPool(pool, "eth");
    const bal = await rpc.getBalance(ADDR as `0x${string}`);
    expect(bal).toBe(1_000_000_000_000_000_000n);
    expect(pool.calls[0]!.method).toBe("eth_getBalance");
    expect(pool.calls[0]!.params).toEqual([ADDR, "latest"]);
  });

  it("getTransactionCount parses hex → number and uses 'latest'", async () => {
    const pool = mockPool({ eth_getTransactionCount: "0x2a" }); // 42
    const rpc = new EvmRpcUsingPool(pool, "eth");
    const nonce = await rpc.getTransactionCount(ADDR as `0x${string}`);
    expect(nonce).toBe(42);
    expect(pool.calls[0]!.params).toEqual([ADDR, "latest"]);
  });

  it("getBalance handles 0x0", async () => {
    const pool = mockPool({ eth_getBalance: "0x0" });
    const rpc = new EvmRpcUsingPool(pool, "eth");
    expect(await rpc.getBalance(ADDR as `0x${string}`)).toBe(0n);
  });

  it("getBalance throws on malformed hex", async () => {
    const pool = mockPool({ eth_getBalance: "notahex" });
    const rpc = new EvmRpcUsingPool(pool, "eth");
    await expect(rpc.getBalance(ADDR as `0x${string}`)).rejects.toThrow(
      /eth_getBalance: expected hex string/,
    );
  });

  it("getChainId throws when value exceeds safe integer", async () => {
    // 2^60 — dépasse Number.MAX_SAFE_INTEGER
    const pool = mockPool({ eth_chainId: "0x1000000000000000" });
    const rpc = new EvmRpcUsingPool(pool, "eth");
    await expect(rpc.getChainId()).rejects.toThrow(
      /exceeds safe integer range/,
    );
  });

  it("uses the networkId it was constructed with", async () => {
    const calls: Array<string> = [];
    const pool: RpcPool = {
      register: vi.fn(),
      // Cast car `vi.fn` ne peut pas inférer une signature générique
      // (`<T>(...) => Promise<T>`) — l'implémentation reste un mock simple.
      request: vi.fn(async (networkId: string) => {
        calls.push(networkId);
        return "0x1";
      }) as unknown as RpcPool["request"],
    };
    const rpc = new EvmRpcUsingPool(pool, "ethereum-sepolia");
    await rpc.getChainId();
    expect(calls).toEqual(["ethereum-sepolia"]);
  });
});

describe("EvmRpcUsingPool + HttpRpcPool (intégration légère)", () => {
  it("works end-to-end with a mocked fetch", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const pool = new HttpRpcPool(fetchMock as unknown as typeof fetch);
    pool.register("eth", [{ url: "https://a" }]);
    const rpc = new EvmRpcUsingPool(pool, "eth");
    expect(await rpc.getChainId()).toBe(1);
  });
});
