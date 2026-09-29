import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { TxHistory } from "../types/history";

export interface HistoryQuery {
  readonly address: Address;
  readonly assetRef?: AssetRef;
  readonly limit: number;
  readonly offset?: number;
}

/**
 * Capacité obligatoire : lire l'historique d'une adresse.
 */
export interface HistoryProvider {
  getHistory(query: HistoryQuery): Promise<TxHistory>;
}
