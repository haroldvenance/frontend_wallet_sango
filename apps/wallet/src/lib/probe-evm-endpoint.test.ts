import { describe, expect, it, vi } from "vitest";

import { probeEvmEndpoint } from "./probe-evm-endpoint";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("probeEvmEndpoint", () => {
  it("OK si chainId correspond", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ jsonrpc: "2.0", result: "0x1", id: 1 }),
    );
    const r = await probeEvmEndpoint(
      "https://rpc.example.com",
      "0x1",
      fetchMock as never,
    );
    expect(r.ok).toBe(true);
    expect(r.chainId).toBe(1);
  });

  it("KO si chainId diffère", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ jsonrpc: "2.0", result: "0x38", id: 1 }),
    );
    const r = await probeEvmEndpoint(
      "https://rpc.example.com",
      "0x1",
      fetchMock as never,
    );
    expect(r.ok).toBe(false);
    expect(r.chainId).toBe(56);
    expect(r.message).toMatch(/Chain ID/);
  });

  it("KO si HTTP non-ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("", { status: 500, statusText: "Server Error" }),
    );
    const r = await probeEvmEndpoint(
      "https://rpc.example.com",
      "0x1",
      fetchMock as never,
    );
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/500/);
  });

  it("KO si réponse non-JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("not json", { status: 200 }),
    );
    const r = await probeEvmEndpoint(
      "https://rpc.example.com",
      "0x1",
      fetchMock as never,
    );
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/non-JSON/);
  });

  it("KO si result malformé", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ jsonrpc: "2.0", result: "not-hex", id: 1 }),
    );
    const r = await probeEvmEndpoint(
      "https://rpc.example.com",
      "0x1",
      fetchMock as never,
    );
    expect(r.ok).toBe(false);
  });

  it("KO si transport error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await probeEvmEndpoint(
      "https://rpc.example.com",
      "0x1",
      fetchMock as never,
    );
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/network down/);
  });
});
