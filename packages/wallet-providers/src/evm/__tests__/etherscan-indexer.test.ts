import { describe, expect, it, vi } from "vitest";

import { EtherscanIndexer } from "../etherscan-indexer";
import type { FetchLike } from "../../rpc/rpc-pool";

const ADDR = "0x" + "aa".repeat(20);
const OTHER = "0x" + "bb".repeat(20);
const HASH = "0x" + "ee".repeat(32);

// ── Helpers ──────────────────────────────────────────────────

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeFetchMock(
  handler: (url: string) => Promise<Response> | Response,
): FetchLike & { mock: { calls: Array<[string, RequestInit | undefined]> } } {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url);
  }) as unknown as FetchLike & {
    mock: { calls: Array<[string, RequestInit | undefined]> };
  };
}

function rawTx(overrides: Record<string, string | undefined> = {}) {
  return {
    blockNumber: "42",
    timeStamp: "1700000000",
    hash: HASH,
    from: ADDR,
    to: OTHER,
    value: "1000000000000000000",
    isError: "0",
    txreceipt_status: "1",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe("EtherscanIndexer — construction", () => {
  it("rejects a missing apiKey", () => {
    expect(
      () => new EtherscanIndexer({ apiKey: "", chainId: 1 }),
    ).toThrow(/apiKey/);
  });

  it("rejects an invalid chainId", () => {
    expect(
      () => new EtherscanIndexer({ apiKey: "K", chainId: 0 }),
    ).toThrow(/chainId/);
  });
});

describe("EtherscanIndexer — URL", () => {
  it("includes chainid, module=account, action=txlist, and apikey", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({ status: "1", message: "OK", result: [rawTx()] }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "MY-KEY",
      chainId: 8453, // Base
      fetch: fetchMock,
      baseUrl: "https://test/api",
    });
    await idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 0);

    const url = fetchMock.mock.calls[0]![0];
    expect(url).toContain("https://test/api?");
    expect(url).toContain("chainid=8453");
    expect(url).toContain("module=account");
    expect(url).toContain("action=txlist");
    expect(url).toContain(`address=${ADDR}`);
    expect(url).toContain("sort=desc");
    expect(url).toContain("apikey=MY-KEY");
  });

  it("derives `page` from offset/limit", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({ status: "1", message: "OK", result: [] }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });

    // offset 0 limit 20 → page 1
    await idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 0);
    expect(fetchMock.mock.calls[0]![0]).toContain("page=1");

    // offset 40 limit 20 → page 3
    await idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 40);
    expect(fetchMock.mock.calls[1]![0]).toContain("page=3");

    // offset 30 limit 10 → page 4
    await idx.getTransactionsByAddress(ADDR as `0x${string}`, 10, 30);
    expect(fetchMock.mock.calls[2]![0]).toContain("page=4");
  });
});

describe("EtherscanIndexer — parsing", () => {
  it("returns a mapped page for a standard tx", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({ status: "1", message: "OK", result: [rawTx()] }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    const page = await idx.getTransactionsByAddress(
      ADDR as `0x${string}`,
      20,
      0,
    );

    expect(page.total).toBe(1); // items.length < limit → total = offset + length
    expect(page.items[0]).toMatchObject({
      hash: HASH,
      blockNumber: 42,
      timestamp: 1_700_000_000,
      from: ADDR,
      to: OTHER,
      value: "1000000000000000000",
      isError: false,
    });
  });

  it("returns empty page for 'No transactions found'", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({
        status: "0",
        message: "No transactions found",
        result: [],
      }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    const page = await idx.getTransactionsByAddress(
      ADDR as `0x${string}`,
      20,
      0,
    );
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  it("marks isError=true for failed txs", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({
        status: "1",
        message: "OK",
        result: [rawTx({ isError: "1", txreceipt_status: "0" })],
      }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    const page = await idx.getTransactionsByAddress(
      ADDR as `0x${string}`,
      20,
      0,
    );
    expect(page.items[0]!.isError).toBe(true);
  });

  it("maps `to: ''` (contract creation) to null", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({
        status: "1",
        message: "OK",
        result: [rawTx({ to: "" })],
      }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    const page = await idx.getTransactionsByAddress(
      ADDR as `0x${string}`,
      20,
      0,
    );
    expect(page.items[0]!.to).toBeNull();
  });

  it("maps pending txs (blockNumber=0)", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({
        status: "1",
        message: "OK",
        result: [rawTx({ blockNumber: "0", timeStamp: "0" })],
      }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    const page = await idx.getTransactionsByAddress(
      ADDR as `0x${string}`,
      20,
      0,
    );
    expect(page.items[0]!.blockNumber).toBe(0);
  });

  it("computes total = offset + length + 1 when page is full", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({
        status: "1",
        message: "OK",
        result: [rawTx(), rawTx({ hash: "0x" + "ff".repeat(32) })],
      }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    const page = await idx.getTransactionsByAddress(
      ADDR as `0x${string}`,
      2, // limit = items.length
      5, // offset
    );
    expect(page.total).toBe(8); // 5 + 2 + 1
  });
});

describe("EtherscanIndexer — erreurs", () => {
  it("throws on HTTP error", async () => {
    const fetchMock = makeFetchMock(
      () => new Response("server down", { status: 503 }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 0),
    ).rejects.toThrow(/HTTP 503/);
  });

  it("throws on Etherscan error status (invalid key)", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({
        status: "0",
        message: "NOTOK",
        result: "Invalid API Key",
      }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 0),
    ).rejects.toThrow(/Invalid API Key/);
  });

  it("throws on network failure", async () => {
    const fetchMock = makeFetchMock(() => {
      throw new Error("ECONNREFUSED");
    });
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 0),
    ).rejects.toThrow(/transport error/);
  });

  it("throws on malformed JSON", async () => {
    const fetchMock = makeFetchMock(
      () =>
        new Response("not json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 0),
    ).rejects.toThrow(/invalid JSON/);
  });

  it("throws on invalid limit / offset", async () => {
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: makeFetchMock(() => jsonOk({ status: "1", result: [] })),
    });
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 0, 0),
    ).rejects.toThrow(/limit/);
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 1001, 0),
    ).rejects.toThrow(/limit/);
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, -1),
    ).rejects.toThrow(/offset/);
  });

  it("throws on malformed tx hash", async () => {
    const fetchMock = makeFetchMock(() =>
      jsonOk({
        status: "1",
        message: "OK",
        result: [rawTx({ hash: "not-a-hash" })],
      }),
    );
    const idx = new EtherscanIndexer({
      apiKey: "K",
      chainId: 1,
      fetch: fetchMock,
    });
    await expect(
      idx.getTransactionsByAddress(ADDR as `0x${string}`, 20, 0),
    ).rejects.toThrow(/invalid tx hash/);
  });
});
