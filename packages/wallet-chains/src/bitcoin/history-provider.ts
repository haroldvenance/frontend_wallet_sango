import type { HistoryProvider, HistoryQuery } from "../capabilities/history-provider";
import type { AssetRef } from "../types/asset";
import type { HistoryItem, TxHistory } from "../types/history";

import { BITCOIN_NATIVE_ASSET_ID } from "./constants";
import type { BitcoinRpc, EsploraTx } from "./rpc";

/**
 * Historique Bitcoin — implémente `HistoryProvider` via Esplora `/txs`
 * (mempool.space), **Patch A.2**.
 *
 * **D-Phase4-3-A.2** :
 *   - D7·A — `delta = 0` → `sent/received` internes gérés par l'UI
 *     ("Interne"). Le provider retourne `from = to = address`.
 *   - D8·B — `counterparty` = première adresse ≠ nous, dans les `vout`
 *     si on envoie, dans les `vin` si on reçoit.
 *   - D9·A — `timestamp` absent si `status.block_time` absent
 *     (tx mempool). L'UI affiche "En attente" sans date.
 *   - D10·A — tronqué à `limit` (défaut 20). Esplora en fournit 50.
 *
 * **Calcul du delta** (D3·A) :
 *   ```
 *   inputOwned  = Σ vin[].prevout.value   si prevout.scriptpubkey_address == address
 *   outputOwned = Σ vout[].value          si vout.scriptpubkey_address  == address
 *   delta       = outputOwned - inputOwned
 *   ```
 *   `delta > 0` → reçue ; `delta < 0` → envoyée ; `0` → self-transfer.
 *
 * **Mapping** :
 *   - reçue     : `from = counterparty`, `to = address`
 *   - envoyée   : `from = address`, `to = counterparty`
 *   - interne   : `from = address`, `to = address`
 *
 *   Cela permet à l'UI de classifier via `from === myAddress` sans
 *   avoir à rejouer le delta.
 *
 * **`amount`** = `abs(delta)`.
 */

const DEFAULT_LIMIT = 20;

export class BitcoinHistoryProvider implements HistoryProvider {
  readonly #rpc: BitcoinRpc;
  readonly #networkId: string;

  constructor(rpc: BitcoinRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async getHistory(query: HistoryQuery): Promise<TxHistory> {
    const address = query.address;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const txs = await this.#rpc.getTxs(address);
    const sliced = txs.slice(0, limit);

    const assetRef: AssetRef = {
      kind: "native",
      assetId: BITCOIN_NATIVE_ASSET_ID,
      networkId: this.#networkId,
    };

    const items: HistoryItem[] = sliced.map((tx) =>
      mapTx(tx, address, this.#networkId, assetRef),
    );

    return { total: items.length, items };
  }
}

// ── Mapping ─────────────────────────────────────────────────

function mapTx(
  tx: EsploraTx,
  address: string,
  networkId: string,
  assetRef: AssetRef,
): HistoryItem {
  const inputOwned = sumInputOwned(tx, address);
  const outputOwned = sumOutputOwned(tx, address);
  const delta = outputOwned - inputOwned;

  const counterparty = findCounterparty(tx, address, delta);

  // D8·B + D7·A — from/to résolus pour permettre à l'UI de
  // classifier `from === myAddress` → envoyée.
  let from: string;
  let to: string;
  if (delta < 0n) {
    from = address;
    to = counterparty ?? "";
  } else if (delta > 0n) {
    from = counterparty ?? "";
    to = address;
  } else {
    // Interne (self-transfer) : from = to = address.
    from = address;
    to = address;
  }

  const status: HistoryItem["status"] = tx.status.confirmed
    ? "confirmed"
    : "pending";

  const amount = delta < 0n ? -delta : delta;

  return {
    txHash: tx.txid,
    networkId,
    status,
    blockHeight: tx.status.block_height,
    // D9·A — `undefined` si non confirmée.
    timestamp: tx.status.block_time,
    from,
    to,
    assetRef,
    amount,
  };
}

function sumInputOwned(tx: EsploraTx, address: string): bigint {
  let sum = 0n;
  for (const vin of tx.vin) {
    const addr = vin.prevout?.scriptpubkey_address;
    if (addr === address && vin.prevout) {
      sum += BigInt(vin.prevout.value);
    }
  }
  return sum;
}

function sumOutputOwned(tx: EsploraTx, address: string): bigint {
  let sum = 0n;
  for (const vout of tx.vout) {
    if (vout.scriptpubkey_address === address) {
      sum += BigInt(vout.value);
    }
  }
  return sum;
}

/**
 * D8·B — première adresse ≠ nous.
 *
 * - Si on envoie (delta < 0) : premier `vout` dont l'adresse ≠ nous.
 * - Sinon (reçue ou interne) : premier `vin` dont l'adresse ≠ nous.
 *
 * Retourne `undefined` si introuvable (outputs atypiques, coinbase,
 * OP_RETURN sans adresse).
 */
function findCounterparty(
  tx: EsploraTx,
  address: string,
  delta: bigint,
): string | undefined {
  if (delta < 0n) {
    for (const vout of tx.vout) {
      const a = vout.scriptpubkey_address;
      if (a && a !== address) return a;
    }
  } else {
    for (const vin of tx.vin) {
      const a = vin.prevout?.scriptpubkey_address;
      if (a && a !== address) return a;
    }
  }
  return undefined;
}
