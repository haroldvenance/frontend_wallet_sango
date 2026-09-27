import { describe, expect, it, vi } from "vitest";

import { SangoRpcClient } from "./client";
import {
  SANGO_TRANSACTION_REJECTED,
  SangoRpcError,
  TRANSPORT_ERROR,
  isTransactionRejected,
} from "./errors";
import type { Hex } from "./types";

// --- Helpers ---------------------------------------------------------------

/** Cast un string en `0x…`. Pratique pour les littéraux de test. */
function hex(s: string): Hex {
  return `0x${s}` as Hex;
}

/** Construit un Response JSON-RPC minimal. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * `fetch` mocké avec signature explicite, pour que `mock.calls` soit
 * typé `[string, RequestInit | undefined][]` (sinon TS infère `[]`).
 */
type FetchArgs = [input: string | URL | Request, init?: RequestInit];
type FetchResult = Promise<Response>;

function mockFetch(
  impl: (...args: FetchArgs) => FetchResult,
): ReturnType<typeof vi.fn<(...args: FetchArgs) => FetchResult>> {
  return vi.fn<(...args: FetchArgs) => FetchResult>(impl);
}

// --- Tests -----------------------------------------------------------------

describe("SangoRpcClient", () => {
  it("getChainInfo returns the parsed result", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        result: {
          chainId: hex("11".repeat(32)),
          height: 12345,
          validatorCount: 7,
          protocolVersion: 1,
        },
      }),
    );
    const client = new SangoRpcClient("http://localhost:8545", { fetch: fetchMock });
    const info = await client.getChainInfo();
    expect(info.height).toBe(12345);
    expect(info.validatorCount).toBe(7);
    expect(info.protocolVersion).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();

    // Vérifie le corps envoyé.
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8545");
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      method: "sango_chainInfo",
      params: [],
      id: 1,
    });
  });

  it("getAccount returns null when account is missing", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({ jsonrpc: "2.0", id: 1, result: null }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const acc = await client.getAccount(hex("aa".repeat(20)));
    expect(acc).toBeNull();
  });

  it("getAccount returns the full object", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        result: {
          address: hex("aa".repeat(20)),
          publicKey: hex("bb".repeat(32)),
          balance: "15000000",
          nonce: 42,
        },
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const acc = await client.getAccount(hex("aa".repeat(20)));
    expect(acc).not.toBeNull();
    expect(acc!.balance).toBe("15000000");
    expect(acc!.nonce).toBe(42);
  });

  it("sendTransaction returns the tx hash", async () => {
    const txHash = hex("cc".repeat(32));
    const fetchMock = mockFetch(async () =>
      jsonResponse({ jsonrpc: "2.0", id: 1, result: txHash }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const hash = await client.sendTransaction(hex("deadbeef"));
    expect(hash).toBe(txHash);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.method).toBe("sango_sendTransaction");
    expect(body.params).toEqual([hex("deadbeef")]);
  });

  it("getChainTip returns height + blockHash", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        result: { height: 999, blockHash: hex("dd".repeat(32)) },
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const tip = await client.getChainTip();
    expect(tip.height).toBe(999);
    expect(tip.blockHash.startsWith("0x")).toBe(true);
  });

  it("propagates server JSON-RPC errors", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        error: { code: SANGO_TRANSACTION_REJECTED, message: "bad nonce" },
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    await expect(client.sendTransaction(hex("deadbeef"))).rejects.toThrow(SangoRpcError);

    try {
      await client.sendTransaction(hex("deadbeef"));
      throw new Error("should have thrown");
    } catch (e) {
      expect(isTransactionRejected(e)).toBe(true);
      expect((e as SangoRpcError).code).toBe(SANGO_TRANSACTION_REJECTED);
    }
  });

  it("rejects on HTTP errors", async () => {
    const fetchMock = mockFetch(async () => new Response("nope", { status: 500 }));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    try {
      await client.getChainInfo();
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SangoRpcError);
      expect((e as SangoRpcError).code).toBe(TRANSPORT_ERROR);
    }
  });

  it("rejects on timeout", async () => {
    const fetchMock = mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const client = new SangoRpcClient("http://x", {
      fetch: fetchMock,
      timeoutMs: 20,
    });
    await expect(client.getChainInfo()).rejects.toThrow(/timed out/);
  });

  it("rejects on malformed JSON", async () => {
    const fetchMock = mockFetch(
      async () =>
        new Response("not json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    await expect(client.getChainInfo()).rejects.toThrow(/Invalid JSON/);
  });

  it("increments JSON-RPC ids", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({ jsonrpc: "2.0", id: 1, result: {} }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    await client.getChainInfo();
    await client.getChainTip();
    const id1 = JSON.parse(fetchMock.mock.calls[0][1]!.body as string).id;
    const id2 = JSON.parse(fetchMock.mock.calls[1][1]!.body as string).id;
    expect(id2).toBe(id1 + 1);
  });
});
