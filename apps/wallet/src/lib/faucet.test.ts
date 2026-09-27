import { describe, expect, it, vi, beforeEach } from "vitest";

import { FaucetError, getFaucetHealth, requestFaucet } from "./faucet";

import { FAUCET_ENDPOINT } from "./config";

const FAUCET = FAUCET_ENDPOINT;

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn<typeof fetch>(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("faucet client", () => {
  it("requestFaucet returns success payload", async () => {
    const fetchMock = mockFetch((url) => {
      expect(url).toBe(`${FAUCET}/faucet`);
      return new Response(
        JSON.stringify({
          tx_hash: "0x" + "ab".repeat(32),
          amount_base_units: "1000000000",
          to: "0x" + "11".repeat(20),
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const res = await requestFaucet("0x" + "11".repeat(20));
    expect(res.tx_hash).toBe("0x" + "ab".repeat(32));
    expect(res.amount_base_units).toBe("1000000000");

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body).toEqual({ address: "0x" + "11".repeat(20) });
  });

  it("requestFaucet throws FaucetError on 429", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            error: "rate limited",
            reason: "address cooldown",
            remaining_secs: 3599,
          }),
          { status: 429, headers: { "content-type": "application/json" } },
        ),
    );

    try {
      await requestFaucet("0x" + "11".repeat(20));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(FaucetError);
      const err = e as FaucetError;
      expect(err.status).toBe(429);
      expect(err.isRateLimited).toBe(true);
      expect(err.reason).toBe("address cooldown");
      expect(err.remainingSecs).toBe(3599);
    }
  });

  it("requestFaucet throws on 400", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ error: "invalid address" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
    );
    await expect(requestFaucet("bad")).rejects.toThrow(FaucetError);
  });

  it("getFaucetHealth returns health payload", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            status: "ok",
            faucet_address: "0x" + "ff".repeat(20),
            balance_base_units: "999999999999",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const health = await getFaucetHealth();
    expect(health.status).toBe("ok");
    expect(health.balance_base_units).toBe("999999999999");
  });
});
