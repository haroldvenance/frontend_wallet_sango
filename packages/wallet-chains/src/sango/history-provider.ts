import type {
  HistoryProvider,
  HistoryQuery,
} from "../capabilities/history-provider";
import type { AssetRef } from "../types/asset";
import type { HistoryItem, TxHistory, TxStatus } from "../types/history";
import { SANGO_NATIVE_ASSET_ID } from "./config";
import type { SangoRpc, SangoRpcTx } from "./rpc";

/**
 * Historique des txs **émises** par une adresse (aligné sur
 * `sango_getTransactionsByAddress` qui n'indexe que le sender).
 *
 * La pagination est déléguée au RPC ; on mappe seulement `Tx` →
 * `HistoryItem`.
 */
export class SangoHistoryProvider implements HistoryProvider {
  readonly #rpc: SangoRpc;
  readonly #networkId: string;

  constructor(rpc: SangoRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async getHistory(query: HistoryQuery): Promise<TxHistory> {
    if (query.assetRef) {
      assertNativeSango(query.assetRef, this.#networkId);
    }

    const page = await this.#rpc.getTransactionsByAddress(
      query.address,
      query.limit,
      query.offset ?? 0,
    );

    return {
      total: page.total,
      items: page.items.map((tx) => toHistoryItem(tx, this.#networkId)),
    };
  }
}

function toHistoryItem(tx: SangoRpcTx, networkId: string): HistoryItem {
  const assetRef: AssetRef = {
    kind: "native",
    assetId: SANGO_NATIVE_ASSET_ID,
    networkId,
  };

  const status: TxStatus =
    tx.blockHeight === null ? "pending" : tx.success ? "confirmed" : "failed";

  return {
    txHash: tx.hash,
    networkId,
    status,
    blockHeight: tx.blockHeight ?? undefined,
    from: tx.sender,
    // `recipient` peut être null pour les tx non-Transfer (Bond, etc.).
    // Fallback sur le sender en V0 — l'UI filtrera via txKind si besoin.
    to: tx.recipient ?? tx.sender,
    assetRef,
    amount: BigInt(tx.value),
  };
}

function assertNativeSango(assetRef: AssetRef, networkId: string): void {
  if (assetRef.kind !== "native" || assetRef.assetId !== SANGO_NATIVE_ASSET_ID) {
    throw new Error(
      `SangoHistoryProvider: only native SANGO supported in V0`,
    );
  }
  if (assetRef.networkId !== networkId) {
    throw new Error(
      `SangoHistoryProvider: network mismatch (expected "${networkId}")`,
    );
  }
}
