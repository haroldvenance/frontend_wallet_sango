import type {
  BitcoinFeeRates,
  BitcoinRpc,
  EsploraTx,
  Utxo,
} from "@sango/wallet-chains";

import type { FetchLike } from "../rpc/rpc-pool";

/**
 * Implémentation `BitcoinRpc` au-dessus de l'API REST mempool.space
 * (Esplora), E2.1.b.2.
 *
 * **D-E2.1-4** — mempool.space est le backend unique du MVP. Il
 * expose l'Esplora API :
 *   - `GET  {baseUrl}/address/{addr}/utxo`
 *   - `GET  {baseUrl}/v1/fees/recommended`
 *   - `POST {baseUrl}/tx` (body = raw hex, text/plain, réponse = txid)
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

  /**
   * **Patch A.2** — liste les transactions touchant une adresse.
   *
   * Esplora renvoie jusqu'à 50 txs confirmées (récents) + les txs
   * mempool en cours. Le `BitcoinHistoryProvider` tronque à 20.
   */
  async getTxs(address: string): Promise<readonly EsploraTx[]> {
    const url = `${this.#baseUrl}/address/${encodeURIComponent(address)}/txs`;
    const response = await this.#fetchOrThrow(url, "getTxs");
    const body = await this.#parseJson(response, "getTxs");

    if (!Array.isArray(body)) {
      throw new Error(
        "MempoolSpaceRpc.getTxs: expected an array, got " + typeof body,
      );
    }

    return body.map((raw) => mapTx(raw));
  }

  async broadcastTx(rawHex: string): Promise<string> {
    // Validation basique : hex pair, non-vide.
    if (
      typeof rawHex !== "string" ||
      rawHex.length === 0 ||
      rawHex.length % 2 !== 0 ||
      !/^[0-9a-fA-F]+$/.test(rawHex)
    ) {
      throw new Error(
        `MempoolSpaceRpc.broadcastTx: expected non-empty even-length hex, got "${rawHex.slice(0, 32)}…"`,
      );
    }

    const url = `${this.#baseUrl}/tx`;
    let response: Response;
    try {
      response = await this.#fetch(url, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: rawHex,
      });
    } catch (cause) {
      throw new Error(
        `MempoolSpaceRpc.broadcastTx: transport error — ${(cause as Error).message}`,
      );
    }

    // Esplora retourne :
    //  - 200/201 : txid en text/plain (succès)
    //  - 400     : message d'erreur (rejet consensus / mempool)
    //  - autre   : erreur serveur
    const text = (await response.text()).trim();

    if (!response.ok) {
      throw new Error(
        `MempoolSpaceRpc.broadcastTx: HTTP ${response.status} — ${text || response.statusText}`,
      );
    }

    // Validation du txid (32 bytes hex, sans 0x).
    if (!/^[0-9a-fA-F]{64}$/.test(text)) {
      throw new Error(
        `MempoolSpaceRpc.broadcastTx: expected 32-byte hex txid, got "${text.slice(0, 40)}…"`,
      );
    }

    return text;
  }

  async #fetchOrThrow(
    url: string,
    ctx: string,
    init?: RequestInit,
  ): Promise<Response> {
    let response: Response;
    try {
      response = await this.#fetch(url, init);
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

/**
 * Mappe une entrée brute Esplora vers `EsploraTx`.
 *
 * Validation minimale : txid 64 hex, vin/vout des arrays, status objet.
 * Les champs facultatifs (`scriptpubkey_address`, `block_time`, …) sont
 * laissés tels quels — le provider history gère leur absence.
 */
function mapTx(raw: unknown): EsploraTx {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("MempoolSpaceRpc.getTxs: malformed tx item");
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.txid !== "string" || !/^[0-9a-fA-F]{64}$/.test(r.txid)) {
    throw new Error(`MempoolSpaceRpc.getTxs: invalid txid`);
  }
  if (!Array.isArray(r.vin)) {
    throw new Error(`MempoolSpaceRpc.getTxs: missing vin array`);
  }
  if (!Array.isArray(r.vout)) {
    throw new Error(`MempoolSpaceRpc.getTxs: missing vout array`);
  }
  if (typeof r.status !== "object" || r.status === null) {
    throw new Error(`MempoolSpaceRpc.getTxs: missing status`);
  }

  const status = r.status as Record<string, unknown>;

  return {
    txid: r.txid,
    version: typeof r.version === "number" ? r.version : 0,
    locktime: typeof r.locktime === "number" ? r.locktime : 0,
    vin: r.vin.map((v) => mapVin(v as Record<string, unknown>)),
    vout: r.vout.map((v) => mapVout(v as Record<string, unknown>)),
    size: typeof r.size === "number" ? r.size : 0,
    weight: typeof r.weight === "number" ? r.weight : 0,
    fee: typeof r.fee === "number" ? r.fee : 0,
    status: {
      confirmed: status.confirmed === true,
      block_height:
        typeof status.block_height === "number"
          ? status.block_height
          : undefined,
      block_hash:
        typeof status.block_hash === "string" ? status.block_hash : undefined,
      block_time:
        typeof status.block_time === "number" ? status.block_time : undefined,
    },
  };
}

function mapVin(r: Record<string, unknown>): EsploraTx["vin"][number] {
  const prevout = r.prevout as Record<string, unknown> | null | undefined;
  return {
    txid: typeof r.txid === "string" ? r.txid : "",
    vout: typeof r.vout === "number" ? r.vout : 0,
    prevout:
      prevout && typeof prevout === "object"
        ? {
            scriptpubkey:
              typeof prevout.scriptpubkey === "string"
                ? prevout.scriptpubkey
                : "",
            scriptpubkey_address:
              typeof prevout.scriptpubkey_address === "string"
                ? prevout.scriptpubkey_address
                : undefined,
            value: typeof prevout.value === "number" ? prevout.value : 0,
          }
        : null,
    is_coinbase: r.is_coinbase === true,
  };
}

function mapVout(r: Record<string, unknown>): EsploraTx["vout"][number] {
  return {
    scriptpubkey: typeof r.scriptpubkey === "string" ? r.scriptpubkey : "",
    scriptpubkey_address:
      typeof r.scriptpubkey_address === "string"
        ? r.scriptpubkey_address
        : undefined,
    value: typeof r.value === "number" ? r.value : 0,
  };
}
