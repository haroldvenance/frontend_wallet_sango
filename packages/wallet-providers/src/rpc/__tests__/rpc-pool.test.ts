import { describe, expect, it, vi } from "vitest";

import {
  HttpRpcPool,
  RpcPoolError,
  createRpcPool,
  type FetchLike,
} from "../rpc-pool";
import { sortEndpointsByPriority } from "../rpc-endpoint";
import {
  httpError,
  jsonRpcErr,
  jsonRpcOk,
  makeFetchMock,
  malformedJson,
  parseBody,
} from "./_helpers";

describe("sortEndpointsByPriority", () => {
  it("sorts by priority ascending (default 0)", () => {
    const sorted = sortEndpointsByPriority([
      { url: "c", priority: 10 },
      { url: "a", priority: 1 },
      { url: "b" },
    ]);
    expect(sorted.map((e) => e.url)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { url: "c", priority: 10 },
      { url: "a", priority: 1 },
    ];
    const snapshot = [...input];
    sortEndpointsByPriority(input);
    expect(input).toEqual(snapshot);
  });
});

describe("HttpRpcPool — register", () => {
  it("throws when fetch is not a function", () => {
    // Note : `undefined` est accepté par TS car le constructeur a une
    // valeur par défaut (= globalThis.fetch). Pour tester le garde-fou,
    // on passe une valeur non-function.
    expect(
      () => new HttpRpcPool(null as unknown as FetchLike),
    ).toThrow(/fetch is not available/);
  });

  it("throws on empty endpoints", () => {
    const pool = new HttpRpcPool(makeFetchMock(async () => jsonRpcOk(1)));
    expect(() => pool.register("eth", [])).toThrow(/at least one endpoint/);
  });

  it("has() reports registration", () => {
    const pool = new HttpRpcPool(makeFetchMock(async () => jsonRpcOk(1)));
    expect(pool.has("eth")).toBe(false);
    pool.register("eth", [{ url: "https://a" }]);
    expect(pool.has("eth")).toBe(true);
  });
});

describe("HttpRpcPool — request (success)", () => {
  it("returns the JSON-RPC result", async () => {
    const fetchMock = makeFetchMock(async () => jsonRpcOk("0x1"));
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [{ url: "https://a" }]);

    const result = await pool.request<string>("eth", "eth_chainId", []);
    expect(result).toBe("0x1");
  });

  it("sends a well-formed JSON-RPC body", async () => {
    const fetchMock = makeFetchMock(async () => jsonRpcOk("0x1"));
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [{ url: "https://a" }]);
    await pool.request("eth", "eth_chainId", []);

    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body.jsonrpc).toBe("2.0");
    expect(body.method).toBe("eth_chainId");
    expect(body.params).toEqual([]);
    expect(typeof body.id).toBe("number");
  });

  it("forwards params", async () => {
    const fetchMock = makeFetchMock(async () => jsonRpcOk("0x0"));
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [{ url: "https://a" }]);
    await pool.request("eth", "eth_getBalance", ["0xabc", "latest"]);
    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body.params).toEqual(["0xabc", "latest"]);
  });

  it("increments JSON-RPC id between calls", async () => {
    const fetchMock = makeFetchMock(async () => jsonRpcOk("0x1"));
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [{ url: "https://a" }]);
    await pool.request("eth", "eth_chainId", []);
    await pool.request("eth", "eth_chainId", []);
    const id1 = parseBody(fetchMock.mock.calls[0]!).id as number;
    const id2 = parseBody(fetchMock.mock.calls[1]!).id as number;
    expect(id2).toBe(id1 + 1);
  });

  it("createRpcPool returns an HttpRpcPool", () => {
    const pool = createRpcPool(makeFetchMock(async () => jsonRpcOk(1)));
    expect(pool).toBeInstanceOf(HttpRpcPool);
  });
});

describe("HttpRpcPool — fallback (échec = endpoint suivant)", () => {
  it("falls back on HTTP error", async () => {
    const calls: string[] = [];
    const fetchMock = makeFetchMock(async (url) => {
      calls.push(url);
      if (url === "https://a") return httpError(500);
      return jsonRpcOk("0x1");
    });
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [
      { url: "https://a", priority: 0 },
      { url: "https://b", priority: 1 },
    ]);

    const result = await pool.request<string>("eth", "eth_chainId");
    expect(result).toBe("0x1");
    expect(calls).toEqual(["https://a", "https://b"]);
  });

  it("falls back on network error (fetch throws)", async () => {
    const calls: string[] = [];
    const fetchMock = makeFetchMock(async (url) => {
      calls.push(url);
      if (url === "https://a") throw new Error("ECONNREFUSED");
      return jsonRpcOk("0x1");
    });
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [
      { url: "https://a", priority: 0 },
      { url: "https://b", priority: 1 },
    ]);

    const result = await pool.request<string>("eth", "eth_chainId");
    expect(result).toBe("0x1");
    expect(calls).toEqual(["https://a", "https://b"]);
  });

  it("falls back on JSON-RPC error (HTTP 200 with error payload)", async () => {
    const calls: string[] = [];
    const fetchMock = makeFetchMock(async (url) => {
      calls.push(url);
      if (url === "https://a") return jsonRpcErr(-32000, "rate limited");
      return jsonRpcOk("0x1");
    });
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [
      { url: "https://a", priority: 0 },
      { url: "https://b", priority: 1 },
    ]);

    const result = await pool.request<string>("eth", "eth_chainId");
    expect(result).toBe("0x1");
    expect(calls).toEqual(["https://a", "https://b"]);
  });

  it("falls back on malformed JSON", async () => {
    const calls: string[] = [];
    const fetchMock = makeFetchMock(async (url) => {
      calls.push(url);
      if (url === "https://a") return malformedJson();
      return jsonRpcOk("0x1");
    });
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [
      { url: "https://a", priority: 0 },
      { url: "https://b", priority: 1 },
    ]);

    const result = await pool.request<string>("eth", "eth_chainId");
    expect(result).toBe("0x1");
  });

  it("JSON-RPC error is never returned as result", async () => {
    const fetchMock = makeFetchMock(async () => jsonRpcErr(-32000, "fail"));
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [{ url: "https://a" }]);

    await expect(pool.request("eth", "eth_chainId")).rejects.toThrow(
      /JSON-RPC -32000: fail/,
    );
  });
});

describe("HttpRpcPool — priorité", () => {
  it("tries endpoints in priority order", async () => {
    const calls: string[] = [];
    const fetchMock = makeFetchMock(async (url) => {
      calls.push(url);
      return jsonRpcOk("0x1");
    });
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [
      { url: "https://slow", priority: 10 },
      { url: "https://fast", priority: 1 },
      { url: "https://mid", priority: 5 },
    ]);

    await pool.request("eth", "eth_chainId");
    expect(calls).toEqual(["https://fast"]);
  });

  it("registered order is preserved (no mutation after failure)", async () => {
    const calls: string[] = [];
    // Phase 1 : tous les endpoints échouent. Phase 2 : succès au premier.
    let phase: 1 | 2 = 1;

    const fetchMock = makeFetchMock(async (url) => {
      calls.push(url);
      if (phase === 1) throw new Error("down");
      return jsonRpcOk("0x1");
    });
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [
      { url: "https://a", priority: 0 },
      { url: "https://b", priority: 1 },
    ]);

    // 1er appel : a échoue, b échoue → RpcPoolError
    await expect(pool.request("eth", "eth_chainId")).rejects.toThrow(
      RpcPoolError,
    );

    // Bascule en phase 2, reset du log de calls
    phase = 2;
    calls.length = 0;

    // 2e appel : a réussit immédiatement (ordre préservé)
    const result = await pool.request<string>("eth", "eth_chainId");
    expect(result).toBe("0x1");
    expect(calls).toEqual(["https://a"]);
  });
});

describe("HttpRpcPool — erreurs agrégées", () => {
  it("throws RpcPoolError with attempts when all fail", async () => {
    const fetchMock = makeFetchMock(async (url) => {
      if (url === "https://a") return httpError(500);
      return httpError(502);
    });
    const pool = new HttpRpcPool(fetchMock);
    pool.register("eth", [
      { url: "https://a", priority: 0 },
      { url: "https://b", priority: 1 },
    ]);

    try {
      await pool.request("eth", "eth_chainId");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RpcPoolError);
      const err = e as RpcPoolError;
      expect(err.networkId).toBe("eth");
      expect(err.method).toBe("eth_chainId");
      expect(err.attempts).toHaveLength(2);
      expect(err.attempts[0]!.url).toBe("https://a");
      expect(err.attempts[0]!.reason).toMatch(/HTTP 500/);
      expect(err.attempts[1]!.url).toBe("https://b");
      expect(err.attempts[1]!.reason).toMatch(/HTTP 502/);
    }
  });

  it("throws when no endpoints registered for the network", async () => {
    const pool = new HttpRpcPool(makeFetchMock(async () => jsonRpcOk(1)));
    await expect(pool.request("eth", "eth_chainId")).rejects.toThrow(
      /no endpoints registered/,
    );
  });

  it("does not attempt any fetch on unknown network", async () => {
    const fetchMock = makeFetchMock(async () => jsonRpcOk(1));
    const pool = new HttpRpcPool(fetchMock);
    await expect(pool.request("unknown", "x")).rejects.toThrow();
    expect(fetchMock.mock.calls).toEqual([]);
  });
});

// Silence "unused" warnings
void vi;
