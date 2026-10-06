import type {
  BitcoinFeeRates,
  BitcoinRpc,
  Utxo,
} from "@sango/wallet-chains";

import type { FetchLike } from "../rpc/rpc-pool";

/**
 * Implémentation `BitcoinRpc` au-dessus de l'API REST mempool.space
 * (Esplora), E2.1.b.2.
 *
 * **D-E2.1-4** — mempool.space est le backend unique du MVP. Il
 * expose l'Esplora API :
 *   - `GET {baseUrl}/address/{addr}/utxo`
 *   - `GET {baseUrl}/v1/fees/recommended`
 *
 * La `baseUrl` inclut déjà le préfixe réseau :
 *   - mainnet  : `https://mempool.space/api`
 *   - testnet3 : `https://mempool.space/testnet/api`
 *
 * **Pas d'API key** : le tier public est gratuit et sans inscription.
 * Rate limit implicite (à surveiller si l'app devient populaire).
 */
export interface MempoolSpaceRpcOptions {
  /** Base URL Esplora. Ex. `https://mempool.space/testnet/api`. */
  readonly baseUrl: string;
  /** `fetch` injectable (tests). Défaut : globalThis.fetch. */
  readonly fetch?: FetchLike;
}

export class MempoolSpaceRpc implements BitcoinRpc {
  readonly #baseUrl: string;
  readonly #fetch: FetchLike;

  constructor(options: MempoolSpaceRpcOptions) {
    if (!options.baseUrl.startsWith("http")) {
      throw new Error(
        `MempoolSpaceRpc: baseUrl must start with http(s), got "${options.baseUrl}"`,
      );
    }
    const raw =
      options.fetch !== undefined ? options.fetch : globalThis.fetch;
    if (typeof raw !== "function") {
      throw new Error(
        "MempoolSpaceRpc: fetch is not available. Pass options.fetch.",
      );
    }
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#fetch = options.fetch ? raw : raw.bind(globalThis);
  }

  async getUtxos(address: string): Promise<readonly Utxo[]> {
    const url = `${this.#baseUrl}/address/${encodeURIComponent(address)}/utxo`;
    const response = await this.#fetchOrThrow(url, "getUtxos");
    const body = await this.#parseJson(response, "getUtxos");

    if (!Array.isArray(body)) {
      throw new Error(
        "MempoolSpaceRpc.getUtxos: expected an array, got " + typeof body,
      );
    }

    return body.map((raw) => mapUtxo(raw));
  }

  async getFeeRates(): Promise<BitcoinFeeRates> {
    const url = `${this.#baseUrl}/v1/fees/recommended`;
    const response = await this.#fetchOrThrow(url, "getFeeRates");
    const body = await this.#parseJson(response, "getFeeRates");

    if (typeof body !== "object" || body === null) {
      throw new Error(
        "MempoolSpaceRpc.getFeeRates: expected an object, got " + typeof body,
      );
    }
    const o = body as Record<string, unknown>;
    return {
      fast: parseSatsPerVbyte(o.fastestFee, "fastestFee"),
      normal: parseSatsPerVbyte(o.halfHourFee, "halfHourFee"),
      slow: parseSatsPerVbyte(o.hourFee, "hourFee"),
    };
  }

  async #fetchOrThrow(url: string, ctx: string): Promise<Response> {
    let response: Response;
    try {
      response = await this.#fetch(url);
    } catch (cause) {
      throw new Error(
        `MempoolSpaceRpc.${ctx}: transport error — ${(cause as Error).message}`,
      );
    }
    if (!response.ok) {
      throw new Error(
        `MempoolSpaceRpc.${ctx}: HTTP ${response.status} ${response.statusText}`,
      );
    }
    return response;
  }

  async #parseJson(response: Response, ctx: string): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new Error(`MempoolSpaceRpc.${ctx}: invalid JSON response`);
    }
  }
}

// ── Helpers de mapping ─────────────────────────────────────

interface RawUtxo {
  readonly txid?: unknown;
  readonly vout?: unknown;
  readonly value?: unknown;
  readonly status?: { readonly confirmed?: unknown };
}

function mapUtxo(raw: unknown): Utxo {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("MempoolSpaceRpc: malformed UTXO item");
  }
  const r = raw as RawUtxo;

  const txid = typeof r.txid === "string" ? r.txid : "";
  if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
    throw new Error(`MempoolSpaceRpc: invalid txid "${txid}"`);
  }

  if (typeof r.vout !== "number" || !Number.isInteger(r.vout) || r.vout < 0) {
    throw new Error(`MempoolSpaceRpc: invalid vout "${String(r.vout)}"`);
  }

  if (typeof r.value !== "number" || !Number.isInteger(r.value) || r.value < 0) {
    throw new Error(`MempoolSpaceRpc: invalid value "${String(r.value)}"`);
  }

  const confirmed =
    typeof r.status === "object" && r.status !== null
      ? r.status.confirmed === true
      : false;

  return {
    txid,
    vout: r.vout,
    value: BigInt(r.value),
    confirmed,
  };
}

function parseSatsPerVbyte(v: unknown, name: string): bigint {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new Error(`MempoolSpaceRpc: invalid ${name} "${String(v)}"`);
  }
  return BigInt(Math.floor(v));
}
