import { describe, expect, it, vi } from "vitest";

import { SangoRpcClient } from "./client";
import {
  SANGO_NOT_FOUND,
  SANGO_TRANSACTION_REJECTED,
  SangoRpcError,
  TRANSPORT_ERROR,
  isNotFound,
  isTransactionRejected,
} from "./errors";
import type { Hex } from "./types";

// --- Helpers ---------------------------------------------------------------

/** Construit un Response JSON-RPC minimal. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function okResponse(result: unknown, id = 1): Response {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

/**
 * Mock typé de `fetch` : signature `(input, init)` compatible avec
 * `typeof fetch`, ce qui permet d'accéder à `mock.calls[0][1].body`.
 */
function makeFetchMock(
  handler: (url: string, init: RequestInit) => Promise<Response>,
) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init ?? {});
  });
}

/**
 * Extrait le body JSON d'un call de fetch mocké.
 *
 * La signature `[input, init?]` reflète exactement le tuple de paramètres
 * de `fetch` (`init` est optionnel côté lib.dom).
 */
function parseBody(call: [RequestInfo | URL, RequestInit?]): Record<string, unknown> {
  const init = call[1];
  if (!init?.body) throw new Error("fetch call has no body");
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

/** Hex runtime → template literal (sûr car on contrôle le contenu). */
function hex(s: string): Hex {
  return (`0x${s}`) as Hex;
}

const ADDR_AA = hex("aa".repeat(20));
const ADDR_FF = hex("ff".repeat(20));
const PK_BB = hex("bb".repeat(32));
const CHAIN_11 = hex("11".repeat(32));
const CHAIN_00 = hex("00".repeat(32));
const TX_CC = hex("cc".repeat(32));

// --- Tests -----------------------------------------------------------------

describe("SangoRpcClient", () => {
  // --- getChainId --------------------------------------------------------

  it("getChainId returns a 32-byte hex", async () => {
    const fetchMock = makeFetchMock(async () => okResponse(CHAIN_11));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const got = await client.getChainId();
    expect(got).toBe(CHAIN_11);

    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body.method).toBe("sango_chainId");
    expect(body.params).toEqual([]);
  });

  // --- getChainInfo ------------------------------------------------------

  it("getChainInfo returns the parsed result", async () => {
    const fetchMock = makeFetchMock(async () =>
      okResponse({
        chainId: CHAIN_11,
        height: 12345,
        validatorCount: 7,
        protocolVersion: 1,
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const info = await client.getChainInfo();
    expect(info.chainId).toBe(CHAIN_11);
    expect(info.height).toBe(12345);
    expect(info.validatorCount).toBe(7);
    expect(info.protocolVersion).toBe(1);

    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      method: "sango_chainInfo",
      params: [],
    });
  });

  it("getChainInfo supports null height (no blocks yet)", async () => {
    const fetchMock = makeFetchMock(async () =>
      okResponse({
        chainId: CHAIN_00,
        height: null,
        validatorCount: 0,
        protocolVersion: 1,
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const info = await client.getChainInfo();
    expect(info.height).toBeNull();
  });

  // --- getBlockNumber ----------------------------------------------------

  it("getBlockNumber returns the height", async () => {
    const fetchMock = makeFetchMock(async () => okResponse(999));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const n = await client.getBlockNumber();
    expect(n).toBe(999);

    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body.method).toBe("sango_blockNumber");
  });

  it("getBlockNumber returns null when no block", async () => {
    const fetchMock = makeFetchMock(async () => okResponse(null));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    expect(await client.getBlockNumber()).toBeNull();
  });

  // --- getAccount --------------------------------------------------------

  it("getAccount returns null when account is missing", async () => {
    const fetchMock = makeFetchMock(async () => okResponse(null));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const acc = await client.getAccount(ADDR_AA);
    expect(acc).toBeNull();
  });

  it("getAccount returns the full object (ghost with null publicKey)", async () => {
    const fetchMock = makeFetchMock(async () =>
      okResponse({
        address: ADDR_AA,
        publicKey: null,
        balance: "15000000",
        nonce: 42,
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const acc = await client.getAccount(ADDR_AA);
    expect(acc).not.toBeNull();
    expect(acc!.publicKey).toBeNull();
    expect(acc!.balance).toBe("15000000");
    expect(acc!.nonce).toBe(42);
  });

  it("getAccount returns publicKey when registered", async () => {
    const fetchMock = makeFetchMock(async () =>
      okResponse({
        address: ADDR_AA,
        publicKey: PK_BB,
        balance: "0",
        nonce: 0,
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const acc = await client.getAccount(ADDR_AA);
    expect(acc!.publicKey).toBe(PK_BB);
  });

  // --- getBalance --------------------------------------------------------

  it("getBalance returns a decimal string", async () => {
    const fetchMock = makeFetchMock(async () => okResponse("100000000"));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const bal = await client.getBalance(ADDR_AA);
    expect(bal).toBe("100000000");

    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body.method).toBe("sango_getBalance");
    expect(body.params).toEqual([ADDR_AA]);
  });

  // --- sendTransaction ---------------------------------------------------

  it("sendTransaction returns the tx hash", async () => {
    const fetchMock = makeFetchMock(async () => okResponse(TX_CC));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const hash = await client.sendTransaction(hex("deadbeef"));
    expect(hash).toBe(TX_CC);

    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body.method).toBe("sango_sendTransaction");
    expect(body.params).toEqual([hex("deadbeef")]);
  });

  // --- Erreurs -----------------------------------------------------------

  it("propagates server JSON-RPC errors (TransactionRejected)", async () => {
    const fetchMock = makeFetchMock(async () =>
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        error: { code: SANGO_TRANSACTION_REJECTED, message: "bad nonce" },
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    try {
      await client.sendTransaction(hex("deadbeef"));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SangoRpcError);
      expect(isTransactionRejected(e)).toBe(true);
      expect((e as SangoRpcError).code).toBe(SANGO_TRANSACTION_REJECTED);
      expect((e as SangoRpcError).message).toBe("bad nonce");
    }
  });

  it("detects NotFound errors (-32001)", async () => {
    const fetchMock = makeFetchMock(async () =>
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        error: { code: SANGO_NOT_FOUND, message: "account not found" },
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    try {
      await client.getAccount(ADDR_FF);
      throw new Error("should have thrown");
    } catch (e) {
      expect(isNotFound(e)).toBe(true);
    }
  });

  it("rejects on HTTP errors", async () => {
    const fetchMock = makeFetchMock(async () => new Response("nope", { status: 500 }));
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
    const fetchMock = vi.fn<typeof fetch>(
      (_input, init) =>
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
    const fetchMock = makeFetchMock(
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
    const fetchMock = makeFetchMock(async () => okResponse({}));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    await client.getChainInfo();
    await client.getBlockNumber();
    const id1 = parseBody(fetchMock.mock.calls[0]!).id;
    const id2 = parseBody(fetchMock.mock.calls[1]!).id;
    expect(id2).toBe((id1 as number) + 1);
  });
});
