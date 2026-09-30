import { vi } from "vitest";

import type { FetchLike } from "../rpc-pool";

/**
 * Construit une `Response` JSON-RPC minimale.
 */
export function jsonRpcOk<T>(result: T, id = 1): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id, result }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

export function jsonRpcErr(
  code: number,
  message: string,
  id = 1,
): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

export function httpError(status: number): Response {
  return new Response("server error", { status });
}

export function malformedJson(): Response {
  return new Response("not json", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Mock `fetch` qui prend une fonction handler (url, init) → Response.
 *
 * Utilise `vi.fn<typeof fetch>` pour exposer `.mock.calls` typés.
 */
export function makeFetchMock(
  handler: (url: string, init: RequestInit) => Promise<Response>,
): FetchLike & { mock: { calls: Array<[string, RequestInit]> } } {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init ?? {});
  });
  return fn as unknown as FetchLike & {
    mock: { calls: Array<[string, RequestInit]> };
  };
}

/**
 * Extrait le body JSON d'un call fetch mocké.
 */
export function parseBody(call: [string, RequestInit]): Record<string, unknown> {
  const init = call[1];
  if (!init.body) throw new Error("fetch call has no body");
  return JSON.parse(init.body as string) as Record<string, unknown>;
}
