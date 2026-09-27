import {
  RPC_INVALID_REQUEST,
  RPC_PARSE_ERROR,
  SangoRpcError,
  TRANSPORT_ERROR,
} from "./errors";
import { decodeTransaction } from "@sango/wallet-core";

import type {
  Account,
  ChainInfo,
  Hex,
  SangoRpcClientOptions,
  Tx,
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
 *
 * Méthodes Rust exposées (cf. `sango-rpc`) :
 *
 *  - `sango_chainId`         → `0x…` (32 bytes)
 *  - `sango_chainInfo`       → `{ chainId, height, validatorCount, protocolVersion }`
 *  - `sango_blockNumber`     → u64 décimal ou null
 *  - `sango_getBlock`        → `{ height, hash, bytes }` ou null
 *  - `sango_getAccount`      → `{ address, publicKey, balance, nonce }` ou null
 *  - `sango_getBalance`      → string décimale
 *  - `sango_getValidators`   → array
 *  - `sango_sendTransaction` → `0x<tx_hash>` (32 bytes)
 *
 * ⚠️ Il n'y a **pas** de `sango_chainTip` côté Rust. Pour la hauteur du
 *    tip, utiliser `getBlockNumber()`.
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
    const raw = options.fetch ?? globalThis.fetch;
    if (typeof raw !== "function") {
      throw new Error(
        "fetch n'est pas disponible. Fournissez `options.fetch` (Node < 18) ou utilisez Node ≥ 20.",
      );
    }
    // ⚠️ `window.fetch` (et le fetch natif en général) exige que son `this`
    //    reste `globalThis`. Dès qu'on le stocke dans un champ et qu'on
    //    l'appelle via `this.#fetch(...)`, le `this` devient l'instance du
    //    client → « fetch called on an object that does not implement
    //    interface Window ». On le bind à `globalThis` pour éviter ça.
    //    Si l'utilisateur a fourni un `fetch` custom (tests, polyfill),
    //    on le respecte tel quel.
    this.#fetch = options.fetch ? raw : raw.bind(globalThis);
    this.#headers = {
      "content-type": "application/json",
      accept: "application/json",
      ...(options.headers ?? {}),
    };
  }

  // --- Méthodes publiques --------------------------------------------------

  /**
   * ChainId32 natif (32 bytes hex). Aligné sur `ChainInfo.chainId`.
   */
  async getChainId(): Promise<Hex> {
    return this.#call<Hex>("sango_chainId", []);
  }

  /**
   * Informations de chaîne (chainId natif + hauteur + validateurs + version).
   *
   * `height` peut être `null` si aucun bloc n'a encore été appliqué.
   */
  async getChainInfo(): Promise<ChainInfo> {
    return this.#call<ChainInfo>("sango_chainInfo", []);
  }

  /**
   * Hauteur du dernier bloc appliqué.
   *
   * Retourne `null` si la chaîne n'a pas encore produit de bloc.
   */
  async getBlockNumber(): Promise<number | null> {
    return this.#call<number | null>("sango_blockNumber", []);
  }

  /**
   * Récupère un compte (balance + nonce + clé publique).
   *
   * Retourne `null` si le compte n'existe pas.
   */
  async getAccount(address: Hex): Promise<Account | null> {
    return this.#call<Account | null>("sango_getAccount", [address]);
  }

  /**
   * Balance en base units (string décimale).
   *
   * Préférer `getAccount` qui retourne balance + nonce + publicKey en un
   * seul appel. `getBalance` reste utile pour un polling léger.
   */
  async getBalance(address: Hex): Promise<string> {
    return this.#call<string>("sango_getBalance", [address]);
  }

  /**
   * Base fee courante (base units par gas), string décimale.
   *
   * ⚠️ À utiliser comme `maxFee ≥ getBaseFee()` lors de la signature.
   *    Recommandation : `maxFee = baseFee * 2n`.
   */
  async getBaseFee(): Promise<string> {
    return this.#call<string>("sango_baseFee", []);
  }

  /**
   * Récupère une transaction par son hash.
   *
   * V1 (actuel) : le backend renvoie `{ hash, tx }` où `tx` est la
   * transaction encodée en hex. On la décode via `decodeTransaction`
   * (wallet-core) puis on enrichit avec des champs vides (blockHeight
   * etc.) en attendant P3.2.c.
   *
   * P3.2.c : le backend renverra directement les champs enrichis, le
   * client basculera sans changer la signature publique.
   */
  async getTransactionByHash(hash: Hex): Promise<Tx | null> {
    const raw = await this.#call<{ hash: Hex; tx: Hex } | null>(
      "sango_getTransactionByHash",
      [hash],
    );
    if (!raw) return null;

    // Décode la tx brute.
    const bytes = hexToBytes(raw.tx);
    const tx = decodeTransaction(bytes);

    return {
      hash: raw.hash,
      blockHeight: null,
      blockHash: null,
      txIndex: null,
      version: tx.version,
      chainId: bytesToHex(tx.chainId) as Hex,
      nonce: Number(tx.nonce),
      sender: bytesToHex(tx.sender) as Hex,
      publicKey: tx.publicKey ? (bytesToHex(tx.publicKey) as Hex) : null,
      gasLimit: Number(tx.gasLimit),
      maxFee: tx.maxFee.toString(),
      priorityFee: tx.priorityFee.toString(),
      value: tx.value.toString(),
      txKind: tx.txKind,
      recipient: tx.recipient ? (bytesToHex(tx.recipient) as Hex) : null,
      data: bytesToHex(tx.data) as Hex,
      signature: bytesToHex(tx.signature) as Hex,
      success: true, // inconnu tant que P3.2.c ne livre pas le receipt
      gasUsed: 0,
    };
  }

  /**
   * Liste paginée des transactions d'une adresse.
   *
   * ⚠️ Nécessite `sango_getTransactionsByAddress` (P3.2.c, pas encore
   *    livré). Tant que la méthode n'existe pas côté nœud, l'appel
   *    échouera avec `-32601 MethodNotFound`.
   */
  async getTransactionsByAddress(
    address: Hex,
    limit = 20,
    offset = 0,
  ): Promise<{ total: number; offset: number; limit: number; items: Tx[] }> {
    return this.#call("sango_getTransactionsByAddress", [
      address,
      limit,
      offset,
    ]);
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

  // --- Interne -------------------------------------------------------------

  async #call<T>(method: string, params: unknown[]): Promise<T> {
    const id = this.#nextId++;
    const body = JSON.stringify({ jsonrpc: "2.0", method, params, id });

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
      const reason = controller.signal.aborted
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


// --- Helpers hex internes --------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("hex must have even length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return ("0x" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")) as Hex;
}
