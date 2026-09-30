import { sortEndpointsByPriority, type RpcEndpoint } from "./rpc-endpoint";

/**
 * Signature `fetch` injectable (test, polyfill, wrapper).
 *
 * Compatible avec la signature native de `globalThis.fetch` — cf.
 * `SangoRpcClient` (`@sango/rpc`) qui suit le même pattern.
 */
export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Pool RPC générique (D-RPC-2).
 *
 * **Abstraction volontairement protocol-agnostic.** Elle ne mentionne
 * NI JSON-RPC, NI HTTP. Le protocole concret vit dans l'implémentation
 * (`HttpRpcPool` ci-dessous).
 *
 * Politique E1 (minimaliste, pas de sophistication) :
 *   - `register(networkId, endpoints)` : enregistrement statique.
 *   - `request(networkId, method, params)` : tri par priorité,
 *     essai séquentiel, premier succès gagne.
 *   - Aucune mutation d'état : l'ordre des endpoints reste le même
 *     après chaque requête, y compris après un échec.
 *   - Aucun circuit breaker, aucun backoff, aucun scoring caché.
 */
export interface RpcPool {
  register(networkId: string, endpoints: readonly RpcEndpoint[]): void;
  request<T>(
    networkId: string,
    method: string,
    params?: readonly unknown[],
  ): Promise<T>;
}

// ── Erreur agrégée ──────────────────────────────────────────

export interface RpcAttempt {
  readonly url: string;
  readonly reason: string;
}

/**
 * Levée quand tous les endpoints d'un network ont échoué.
 *
 * Conserve la liste des tentatives pour le diagnostic.
 */
export class RpcPoolError extends Error {
  readonly networkId: string;
  readonly method: string;
  readonly attempts: readonly RpcAttempt[];

  constructor(
    networkId: string,
    method: string,
    attempts: readonly RpcAttempt[],
  ) {
    const last = attempts[attempts.length - 1];
    super(
      `RpcPool: all ${attempts.length} endpoint(s) failed for "${method}" ` +
        `on network "${networkId}". Last error: ${last?.reason ?? "unknown"}`,
    );
    this.name = "RpcPoolError";
    this.networkId = networkId;
    this.method = method;
    this.attempts = attempts;
  }
}

// ── Implémentation HTTP JSON-RPC 2.0 ────────────────────────

interface JsonRpcSuccess<T> {
  readonly jsonrpc: "2.0";
  readonly result: T;
  readonly id: number;
}

interface JsonRpcFailure {
  readonly jsonrpc: "2.0";
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
  readonly id: number;
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

/**
 * Pool HTTP qui parle JSON-RPC 2.0 aux endpoints enregistrés.
 *
 * Le protocole JSON-RPC **vit ici** et n'apparaît pas dans l'interface
 * `RpcPool` — c'est ce qui permet à d'autres transports (WebSocket,
 * gRPC, IPC) d'implémenter la même abstraction plus tard.
 */
export class HttpRpcPool implements RpcPool {
  readonly #endpoints = new Map<string, readonly RpcEndpoint[]>();
  readonly #fetch: FetchLike;
  #nextId = 1;

  constructor(fetchImpl: FetchLike = globalThis.fetch) {
    if (typeof fetchImpl !== "function") {
      throw new Error(
        "HttpRpcPool: fetch is not available. Pass a fetch implementation.",
      );
    }
    this.#fetch = fetchImpl;
  }

  register(networkId: string, endpoints: readonly RpcEndpoint[]): void {
    if (endpoints.length === 0) {
      throw new Error(
        `HttpRpcPool.register: at least one endpoint required for "${networkId}"`,
      );
    }
    // Copie défensive — évite qu'un appelant mute son tableau après.
    this.#endpoints.set(networkId, [...endpoints]);
  }

  has(networkId: string): boolean {
    return this.#endpoints.has(networkId);
  }

  async request<T>(
    networkId: string,
    method: string,
    params: readonly unknown[] = [],
  ): Promise<T> {
    const registered = this.#endpoints.get(networkId);
    if (!registered || registered.length === 0) {
      throw new Error(
        `HttpRpcPool: no endpoints registered for network "${networkId}"`,
      );
    }

    // Tri sur une copie — l'ordre enregistré reste intact.
    const ordered = sortEndpointsByPriority(registered);
    const attempts: RpcAttempt[] = [];

    for (const endpoint of ordered) {
      try {
        return await this.#callEndpoint<T>(endpoint.url, method, params);
      } catch (cause) {
        const reason =
          cause instanceof Error ? cause.message : String(cause);
        attempts.push({ url: endpoint.url, reason });
        // continue avec l'endpoint suivant (pas de mutation d'état)
      }
    }

    throw new RpcPoolError(networkId, method, attempts);
  }

  async #callEndpoint<T>(
    url: string,
    method: string,
    params: readonly unknown[],
  ): Promise<T> {
    const id = this.#nextId++;
    const body = JSON.stringify({ jsonrpc: "2.0", method, params, id });

    let response: Response;
    try {
      response = await this.#fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body,
      });
    } catch (cause) {
      throw new Error(`Transport: ${(cause as Error).message}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new Error("Invalid JSON in RPC response");
    }

    if (!isJsonRpcResponse<T>(parsed)) {
      throw new Error("Malformed JSON-RPC response");
    }

    // Un JSON-RPC error est un échec — jamais retourné comme result.
    if ("error" in parsed && parsed.error) {
      throw new Error(
        `JSON-RPC ${parsed.error.code}: ${parsed.error.message}`,
      );
    }

    return (parsed as JsonRpcSuccess<T>).result;
  }
}

function isJsonRpcResponse<T>(
  v: unknown,
): v is JsonRpcResponse<T> {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.jsonrpc !== "2.0") return false;
  const hasResult = "result" in o;
  const hasError = "error" in o;
  return hasResult || hasError;
}

/** Raccourci — `new HttpRpcPool(fetch?)`. */
export function createRpcPool(fetchImpl?: FetchLike): RpcPool {
  return new HttpRpcPool(fetchImpl);
}
