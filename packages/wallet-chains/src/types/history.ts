import type { AssetRef } from "./asset";

export type TxStatus = "pending" | "confirmed" | "failed";

export interface HistoryItem {
  readonly txHash: string;
  readonly networkId: string;
  readonly status: TxStatus;
  readonly blockHeight?: number;
  /** Timestamp Unix (secondes). */
  readonly timestamp?: number;
  readonly from: string;
  readonly to: string;
  readonly assetRef: AssetRef;
  readonly amount: bigint;
}

export interface TxHistory {
  readonly total: number;
  readonly items: readonly HistoryItem[];
}
