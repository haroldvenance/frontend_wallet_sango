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
  /**
   * **Phase 13-E** — Frais effectifs en base units de l'asset
   * natif (wei pour EVM, satoshis pour Bitcoin).
   *
   * **Absent** si l'indexeur/provider ne les expose pas :
   *   - SANGO : backend sans `gasUsed` (receipt absent)
   *   - EVM : si Etherscan omet `gasUsed` ou `gasPrice` (rare)
   */
  readonly fee?: bigint;
}

export interface TxHistory {
  readonly total: number;
  readonly items: readonly HistoryItem[];
}
