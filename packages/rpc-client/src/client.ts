import {
  RPC_INVALID_REQUEST,
  RPC_PARSE_ERROR,
  SangoRpcError,
  TRANSPORT_ERROR,
} from "./errors";
import type {
  Account,
  ChainInfo,
  ChainTip,
  Hex,
  SangoRpcClientOptions,
} from "./types";

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

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Client JSON-RPC 2.0 pour un nœud Sango.
 *
 * Le client est **sans état** : chaque appel est une requête HTTP POST
 * indépendante. Le seul état interne est le compteur d'`id` JSON-RPC.
 */
export class SangoRpcClient {
  readonly #endpoint: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;
  readonly #headers: Record<string, string>;
  #nextId = 1;

  constructor(endpoint: string, options: SangoRpcClientOptions = {}) {
    this.#endpoint = endpoint;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const f = options.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new Error(
        "fetch n'est pas disponible. Fournissez `options.fetch` (Node < 18) ou utilisez Node ≥ 20.",
      );
    }
    this.#fetch = f;
    this.#headers = {
      "content-type": "application/json",
      accept: "application/json",
      ...(options.headers ?? {}),
    };
  }

  // --- Méthodes publiques --------------------------------------------------

  /** Récupère les informations de chaîne. */
  async getChainInfo(): Promise<ChainInfo> {
    return this.#call<ChainInfo>("sango_chainInfo", []);
  }

  /**
   * Récupère un compte (balance + nonce + clé publique).
   *
   * Retourne `null` si le compte n'existe pas.
   */
  async getAccount(address: Hex): Promise<Account | null> {
    const result = await this.#call<Account | null>("sango_getAccount", [address]);
    return result;
  }

  /**
   * Soumet une transaction signée.
   *
   * @param fullHex `0x…` — la transaction **complète** (unsigned || signature),
   *                c.-à-d. `encodeTransaction(signed)` de wallet-core.
   * @returns Le hash de transaction (`0x…`, 32 bytes).
   */
  async sendTransaction(fullHex: Hex): Promise<Hex> {
    return this.#call<Hex>("sango_sendTransaction", [fullHex]);
  }

  /** Récupère le dernier bloc appliqué. */
  async getChainTip(): Promise<ChainTip> {
    return this.#call<ChainTip>("sango_chainTip", []);
  }

  // --- Interne -------------------------------------------------------------

  async #call<T>(method: string, params: unknown[]): Promise<T> {
    const id = this.#nextId++;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);

    let response: Response;
    try {
      response = await this.#fetch(this.#endpoint, {
        method: "POST",
        headers: this.#headers,
        body,
        signal: controller.signal,
      });
    } catch (cause) {
      clearTimeout(timer);
      const reason =
        controller.signal.aborted
          ? `Request timed out after ${this.#timeoutMs} ms`
          : `Transport error: ${(cause as Error).message}`;
      throw new SangoRpcError(TRANSPORT_ERROR, reason, cause);
    }
    clearTimeout(timer);

    if (!response.ok) {
      throw new SangoRpcError(
        TRANSPORT_ERROR,
        `HTTP ${response.status} ${response.statusText}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new SangoRpcError(RPC_PARSE_ERROR, "Invalid JSON in RPC response");
    }

    if (!isJsonRpcResponse<T>(parsed)) {
      throw new SangoRpcError(RPC_INVALID_REQUEST, "Malformed JSON-RPC response");
    }

    if ("error" in parsed && parsed.error) {
      throw new SangoRpcError(
        parsed.error.code,
        parsed.error.message,
        parsed.error.data,
      );
    }

    return (parsed as JsonRpcSuccess<T>).result;
  }
}

function isJsonRpcResponse<T>(v: unknown): v is JsonRpcResponse<T> {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.jsonrpc !== "2.0") return false;
  if (typeof o.id !== "number") return false;
  const hasResult = "result" in o;
  const hasError = "error" in o;
  return hasResult || hasError;
}
