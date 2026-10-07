import { describe, expect, it, vi } from "vitest";

import { MempoolSpaceRpc } from "../mempool-space-rpc";

const BASE = "https://mempool.space/testnet/api";
const ADDR = "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("MempoolSpaceRpc — construction", () => {
  it("rejette une baseUrl non-http", () => {
    expect(() => new MempoolSpaceRpc({ baseUrl: "ftp://x" })).toThrow(/http/);
  });

  it("strip trailing slash", () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: "https://mempool.space/api/",
      fetch: vi.fn(),
    });
    expect(rpc).toBeDefined();
  });
});

describe("MempoolSpaceRpc — getUtxos", () => {
  it("encode correctement l'URL et mappe les UTXOs", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe(`${BASE}/address/${ADDR}/utxo`);
      return jsonResponse([
        {
          txid: "a".repeat(64),
          vout: 0,
          value: 150_000,
          status: { confirmed: true },
        },
        {
          txid: "b".repeat(64),
          vout: 1,
          value: 50_000,
          status: { confirmed: false },
        },
      ]);
    });
    const rpc = new MempoolSpaceRpc({ baseUrl: BASE, fetch: fetchMock as never });
    const utxos = await rpc.getUtxos(ADDR);

    expect(utxos).toEqual([
      { txid: "a".repeat(64), vout: 0, value: 150_000n, confirmed: true },
      { txid: "b".repeat(64), vout: 1, value: 50_000n, confirmed: false },
    ]);
  });

  it("retourne [] pour un tableau vide", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () => jsonResponse([])) as never,
    });
    expect(await rpc.getUtxos(ADDR)).toEqual([]);
  });

  it("rejette un UTXO avec txid malformé", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        jsonResponse([{ txid: "not-hex", vout: 0, value: 1, status: {} }]),
      ) as never,
    });
    await expect(rpc.getUtxos(ADDR)).rejects.toThrow(/invalid txid/);
  });

  it("rejette un UTXO avec value négative", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        jsonResponse([
          { txid: "a".repeat(64), vout: 0, value: -5, status: {} },
        ]),
      ) as never,
    });
    await expect(rpc.getUtxos(ADDR)).rejects.toThrow(/invalid value/);
  });

  it("propage une erreur HTTP", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () => jsonResponse({}, 503)) as never,
    });
    await expect(rpc.getUtxos(ADDR)).rejects.toThrow(/HTTP 503/);
  });

  it("propage une erreur transport", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }) as never,
    });
    await expect(rpc.getUtxos(ADDR)).rejects.toThrow(/transport error/);
  });
});

describe("MempoolSpaceRpc — getFeeRates", () => {
  it("mappe fastestFee/halfHourFee/hourFee → fast/normal/slow", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        jsonResponse({
          fastestFee: 12,
          halfHourFee: 6,
          hourFee: 2,
          economyFee: 1,
          minimumFee: 1,
        }),
      ) as never,
    });
    const rates = await rpc.getFeeRates();
    expect(rates).toEqual({ fast: 12n, normal: 6n, slow: 2n });
  });

  it("floor les valeurs décimales", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        jsonResponse({ fastestFee: 12.9, halfHourFee: 6.1, hourFee: 2.5 }),
      ) as never,
    });
    const rates = await rpc.getFeeRates();
    expect(rates).toEqual({ fast: 12n, normal: 6n, slow: 2n });
  });

  it("rejette une valeur non-numérique", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        jsonResponse({ fastestFee: "12", halfHourFee: 6, hourFee: 2 }),
      ) as never,
    });
    await expect(rpc.getFeeRates()).rejects.toThrow(/invalid fastestFee/);
  });

  it("rejette une valeur négative", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        jsonResponse({ fastestFee: -1, halfHourFee: 6, hourFee: 2 }),
      ) as never,
    });
    await expect(rpc.getFeeRates()).rejects.toThrow(/invalid fastestFee/);
  });
});

describe("MempoolSpaceRpc — broadcastTx", () => {
  const TXID = "a".repeat(64);
  const RAW_HEX = "0200000001" + "a".repeat(64) + "00000000";

  it("POST /tx avec body text/plain et retourne le txid", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(`${BASE}/tx`);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({ "content-type": "text/plain" });
      expect(init?.body).toBe(RAW_HEX);
      return new Response(TXID, {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    });
    const rpc = new MempoolSpaceRpc({ baseUrl: BASE, fetch: fetchMock as never });
    const hash = await rpc.broadcastTx(RAW_HEX);
    expect(hash).toBe(TXID);
  });

  it("accepte une réponse 201", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () => new Response(TXID, { status: 201 })) as never,
    });
    expect(await rpc.broadcastTx(RAW_HEX)).toBe(TXID);
  });

  it("rejette un rawHex vide", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn() as never,
    });
    await expect(rpc.broadcastTx("")).rejects.toThrow(/non-empty even-length hex/);
  });

  it("rejette un rawHex impair", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn() as never,
    });
    await expect(rpc.broadcastTx("020")).rejects.toThrow(/non-empty even-length hex/);
  });

  it("rejette un rawHex non-hex", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn() as never,
    });
    await expect(rpc.broadcastTx("zzzz")).rejects.toThrow(/non-empty even-length hex/);
  });

  it("propage un HTTP 400 avec le message d'erreur Esplora", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        new Response("bad-txns-inputs-missingorspent", { status: 400 }),
      ) as never,
    });
    await expect(rpc.broadcastTx(RAW_HEX)).rejects.toThrow(
      /HTTP 400.*bad-txns-inputs-missingorspent/,
    );
  });

  it("rejette une réponse 200 avec txid malformé", async () => {
    const rpc = new MempoolSpaceRpc({
      baseUrl: BASE,
      fetch: vi.fn(async () =>
        new Response("not-a-txid", { status: 200 }),
      ) as never,
    });
    await expect(rpc.broadcastTx(RAW_HEX)).rejects.toThrow(
      /expected 32-byte hex txid/,
    );
  });
});
