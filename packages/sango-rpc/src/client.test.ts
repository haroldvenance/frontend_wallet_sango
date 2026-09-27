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

  // --- getTransactionByHash ----------------------------------------------

  it("getTransactionByHash decodes the raw tx", async () => {
    // Un TxItem minimal : txKind 1 (Transfer), pas de public_key,
    // recipient 0xbb…bb, value 100, data vide.
    // On réutilise le golden vector connu (unsigned 147 bytes + signature).
    const unsignedHex =
      "01000000" +
      "11".repeat(32) +
      "2a00000000000000" +          // nonce = 42
      "aa".repeat(20) +
      "00" +                         // publicKey = None
      "0852000000000000" +          // gasLimit = 21000
      "14000000000000000000000000000000" + // maxFee = 20
      "02000000000000000000000000000000" + // priorityFee = 2
      "64000000000000000000000000000000" + // value = 100
      "01" +                         // txKind = Transfer
      "01" +                         // recipient = Some
      "bb".repeat(20) +
      "00000000";                    // data = []
    const signatureHex = "00".repeat(64);
    const fullHex = "0x" + unsignedHex + signatureHex;

    const fetchMock = makeFetchMock(async () =>
      okResponse({
        hash: "0x" + "ee".repeat(32),
        blockHeight: 42,
        blockHash: "0x" + "cc".repeat(32),
        txIndex: 0,
        kind: "native",
        txKind: 1,
        tx: fullHex,
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const tx = await client.getTransactionByHash(hex("ee".repeat(32)));

    expect(tx).not.toBeNull();
    expect(tx!.hash).toBe("0x" + "ee".repeat(32));
    expect(tx!.kind).toBe("native");
    expect(tx!.blockHeight).toBe(42);
    expect(tx!.txIndex).toBe(0);
    expect(tx!.nonce).toBe(42);
    expect(tx!.sender).toBe("0x" + "aa".repeat(20));
    expect(tx!.publicKey).toBeNull();
    expect(tx!.gasLimit).toBe(21000);
    expect(tx!.maxFee).toBe("20");
    expect(tx!.priorityFee).toBe("2");
    expect(tx!.value).toBe("100");
    expect(tx!.txKind).toBe(1);
    expect(tx!.recipient).toBe("0x" + "bb".repeat(20));
    expect(tx!.data).toBe("0x");
  });

  it("getTransactionByHash returns null for unknown", async () => {
    const fetchMock = makeFetchMock(async () => okResponse(null));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const tx = await client.getTransactionByHash(hex("00".repeat(32)));
    expect(tx).toBeNull();
  });

  // --- getTransactionsByAddress ------------------------------------------

  it("getTransactionsByAddress decodes each item", async () => {
    const unsignedHex =
      "01000000" +
      "11".repeat(32) +
      "2a00000000000000" +
      "aa".repeat(20) +
      "00" +
      "0852000000000000" +
      "14000000000000000000000000000000" +
      "02000000000000000000000000000000" +
      "64000000000000000000000000000000" +
      "01" +
      "01" +
      "bb".repeat(20) +
      "00000000";
    const fullHex = "0x" + unsignedHex + "00".repeat(64);

    const fetchMock = makeFetchMock(async () =>
      okResponse({
        total: 1,
        offset: 0,
        limit: 20,
        items: [
          {
            hash: "0x" + "ee".repeat(32),
            blockHeight: 250,
            blockHash: "0x" + "cc".repeat(32),
            txIndex: 0,
            kind: "native",
            txKind: 1,
            tx: fullHex,
          },
        ],
      }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const page = await client.getTransactionsByAddress(hex("aa".repeat(20)), 20, 0);

    expect(page.total).toBe(1);
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(20);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.hash).toBe("0x" + "ee".repeat(32));
    expect(page.items[0]!.blockHeight).toBe(250);
    expect(page.items[0]!.txKind).toBe(1);
    expect(page.items[0]!.value).toBe("100");
  });

  it("getTransactionsByAddress returns empty page for address with no history", async () => {
    const fetchMock = makeFetchMock(async () =>
      okResponse({ total: 0, offset: 0, limit: 20, items: [] }),
    );
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const page = await client.getTransactionsByAddress(hex("dd".repeat(20)));
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  // --- getBaseFee --------------------------------------------------------

  it("getBaseFee returns the decimal string", async () => {
    const fetchMock = makeFetchMock(async () => okResponse("1000"));
    const client = new SangoRpcClient("http://x", { fetch: fetchMock });
    const fee = await client.getBaseFee();
    expect(fee).toBe("1000");

    const body = parseBody(fetchMock.mock.calls[0]!);
    expect(body.method).toBe("sango_baseFee");
    expect(body.params).toEqual([]);
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
