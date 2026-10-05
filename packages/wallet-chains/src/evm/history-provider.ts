import type {
  HistoryProvider,
  HistoryQuery,
} from "../capabilities/history-provider";
import type { AssetRef } from "../types/asset";
import type {
  HistoryItem,
  TxHistory,
  TxStatus,
} from "../types/history";
import type { EvmIndexer, EvmIndexerTx } from "./indexer";

/**
 * Historique EVM basé sur un indexeur (D-INDEXER-1).
 *
 * Le provider convertit `EvmIndexerTx` → `HistoryItem` (type
 * universel wallet-chains). L'UI EVM décide de l'affichage
 * (Envoyée / Reçue) selon `from === address` / `to === address`.
 *
 * **Pas de filtre côté provider** : on retourne tout ce qui touche
 * l'adresse. `assetRef` dans `HistoryQuery` est ignoré en E1.5
 * (uniquement ETH natif).
 */
export class EvmHistoryProvider implements HistoryProvider {
  readonly #indexer: EvmIndexer;
  readonly #networkId: string;
  readonly #nativeAsset: string;

  constructor(indexer: EvmIndexer, networkId: string, nativeAsset: string) {
    this.#indexer = indexer;
    this.#networkId = networkId;
    this.#nativeAsset = nativeAsset;
  }

  async getHistory(query: HistoryQuery): Promise<TxHistory> {
    const page = await this.#indexer.getTransactionsByAddress(
      query.address,
      query.limit,
      query.offset ?? 0,
    );

    return {
      total: page.total,
      items: page.items.map((tx) =>
        toHistoryItem(tx, this.#networkId, this.#nativeAsset),
      ),
    };
  }
}

// ── Conversion EvmIndexerTx → HistoryItem ───────────────────

function toHistoryItem(
  tx: EvmIndexerTx,
  networkId: string,
  nativeAsset: string,
): HistoryItem {
  const assetRef: AssetRef = {
    kind: "native",
    assetId: nativeAsset,
    networkId,
  };

  // `blockNumber === 0` : tx en mempool (Etherscan retourne 0 pour
  // les tx non confirmées). Sinon confirmée ou échouée.
  const status: TxStatus =
    tx.blockNumber === 0
      ? "pending"
      : tx.isError
        ? "failed"
        : "confirmed";

  return {
    txHash: tx.hash,
    networkId,
    status,
    blockHeight: tx.blockNumber > 0 ? tx.blockNumber : undefined,
    timestamp: tx.timestamp,
    from: tx.from,
    // `to === null` : contract creation. On expose la chaîne vide
    // plutôt que null (le type HistoryItem.to est string).
    to: tx.to ?? "0x" + "0".repeat(40),
    assetRef,
    amount: BigInt(tx.value),
  };
}
