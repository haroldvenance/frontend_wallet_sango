import type { Address, EvmIndexer, EvmIndexerPage } from "@sango/wallet-chains";

import type { FetchLike } from "../rpc/rpc-pool";

/**
 * Adapter Etherscan V2 (D-INDEXER-1).
 *
 * **Défini dans wallet-providers**, pas dans wallet-chains/evm —
 * Etherscan n'est qu'une implémentation d'`EvmIndexer`, remplaçable
 * par Blockscout, The Graph, ou un indexeur maison.
 *
 * **Etherscan V2** (unified endpoint) :
 *   https://api.etherscan.io/v2/api?chainid={id}&module=account
 *     &action=txlist&address=0x…&startblock=0&endblock=99999999
 *     &page={n}&offset={m}&sort=desc&apikey={key}
 *
 * Le `chainId` est **décimal** (1, 11155111, 8453, 42161).
 *
 * **Pas de total natif** : Etherscan ne retourne pas de champ
 * "total". On utilise la convention :
 *   - items.length < limit → dernière page → total = offset + items.length
 *   - items.length === limit → au moins une page suivante
 *                             → total = offset + items.length + 1
 * Le UI l'utilise pour décider s'il faut afficher "Charger plus".
 */
export interface EtherscanIndexerOptions {
  readonly apiKey: string;
  /** ChainId décimal (Ethereum: 1, Sepolia: 11155111, Base: 8453, Arbitrum: 42161). */
  readonly chainId: number;
  /** `fetch` injectable (tests). Défaut : globalThis.fetch. */
  readonly fetch?: FetchLike;
  /** Override base URL (tests). Défaut : https://api.etherscan.io/v2/api */
  readonly baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.etherscan.io/v2/api";

export class EtherscanIndexer implements EvmIndexer {
  readonly #apiKey: string;
  readonly #chainId: number;
  readonly #fetch: FetchLike;
  readonly #baseUrl: string;

  constructor(options: EtherscanIndexerOptions) {
    if (!options.apiKey) {
      throw new Error("EtherscanIndexer: apiKey is required");
    }
    if (!Number.isInteger(options.chainId) || options.chainId <= 0) {
      throw new Error(
        `EtherscanIndexer: invalid chainId ${String(options.chainId)}`,
      );
    }
    // Idem HttpRpcPool : `undefined` ⇒ global, `null` ⇒ erreur.
    const raw =
      options.fetch !== undefined ? options.fetch : globalThis.fetch;
    if (typeof raw !== "function") {
      throw new Error(
        "EtherscanIndexer: fetch is not available. Pass options.fetch.",
      );
    }
    this.#apiKey = options.apiKey;
    this.#chainId = options.chainId;
    // ⚠️ `window.fetch` exige `this === window`. Stocké dans un champ
    //    privé et appelé via `this.#fetch(...)`, le `this` devient
    //    l'instance → « called on an object that does not implement
    //    interface Window ». On bind à `globalThis` SEULEMENT si c'est
    //    le fetch du global (un mock injecté reste inchangé).
    this.#fetch = options.fetch ? raw : raw.bind(globalThis);
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async getTransactionsByAddress(
    address: Address,
    limit: number,
    offset: number,
  ): Promise<EvmIndexerPage> {
    if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
      throw new Error(
        `EtherscanIndexer: limit must be in [1, 1000], got ${limit}`,
      );
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error(`EtherscanIndexer: invalid offset ${offset}`);
    }

    // Pagination Etherscan : `page` est 1-indexé, `offset` = taille.
    // On dérive `page` depuis `offset / limit`.
    const page = Math.floor(offset / limit) + 1;

    const url = this.#buildUrl({
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: String(page),
      offset: String(limit),
      sort: "desc",
      apikey: this.#apiKey,
    });

    let response: Response;
    try {
      response = await this.#fetch(url);
    } catch (cause) {
      throw new Error(
        `EtherscanIndexer: transport error — ${(cause as Error).message}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `EtherscanIndexer: HTTP ${response.status} ${response.statusText}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("EtherscanIndexer: invalid JSON response");
    }

    return this.#parseResponse(body, limit, offset);
  }

  #buildUrl(params: Record<string, string>): string {
    const qs = new URLSearchParams({
      chainid: String(this.#chainId),
      ...params,
    });
    return `${this.#baseUrl}?${qs.toString()}`;
  }

  #parseResponse(
    body: unknown,
    limit: number,
    offset: number,
  ): EvmIndexerPage {
    if (typeof body !== "object" || body === null) {
      throw new Error("EtherscanIndexer: malformed response");
    }
    const o = body as Record<string, unknown>;

    // Cas 1 — "No transactions found" → status "0", result: []
    if (o.status === "0" && o.message === "No transactions found") {
      return { total: offset, items: [] };
    }

    // Cas 2 — Autre erreur (invalid API key, rate limited…)
    if (o.status !== "1") {
      const msg = typeof o.message === "string" ? o.message : "unknown error";
      const result = typeof o.result === "string" ? o.result : "";
      throw new Error(`EtherscanIndexer: ${msg}${result ? ` — ${result}` : ""}`);
    }

    if (!Array.isArray(o.result)) {
      throw new Error("EtherscanIndexer: expected `result` to be an array");
    }

    const items = o.result.map((raw) => mapTx(raw));

    // Convention totale (voir doc de classe).
    const total =
      items.length < limit ? offset + items.length : offset + items.length + 1;

    return { total, items };
  }
}

// ── Mapping Etherscan item → EvmIndexerTx ───────────────────

interface RawEtherscanTx {
  readonly blockNumber?: string;
  readonly timeStamp?: string;
  readonly hash?: string;
  readonly from?: string;
  readonly to?: string;
  readonly value?: string;
  readonly isError?: string;
  readonly txreceipt_status?: string;
}

function mapTx(raw: unknown): import("@sango/wallet-chains").EvmIndexerTx {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("EtherscanIndexer: malformed tx item");
  }
  const r = raw as RawEtherscanTx;

  const hash = r.hash ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error(`EtherscanIndexer: invalid tx hash "${hash}"`);
  }

  const from = r.from ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(from)) {
    throw new Error(`EtherscanIndexer: invalid from address "${from}"`);
  }

  // `to === ""` : contract creation.
  const to = r.to && r.to.length > 0 ? r.to : null;
  if (to !== null && !/^0x[0-9a-fA-F]{40}$/.test(to)) {
    throw new Error(`EtherscanIndexer: invalid to address "${to}"`);
  }

  const blockNumber = Number.parseInt(r.blockNumber ?? "0", 10);
  const timestamp = Number.parseInt(r.timeStamp ?? "0", 10);
  const value = r.value ?? "0";

  // `isError === "1"` ou `txreceipt_status === "0"` → failed.
  // Attention : txreceipt_status est "0" pour pending aussi — mais
  // pending a blockNumber === "0", donc on ne l'utilise pas pour
  // distinguer failed vs pending.
  const isError = r.isError === "1";

  return {
    hash,
    blockNumber,
    timestamp,
    from,
    to,
    value,
    isError,
  };
}
