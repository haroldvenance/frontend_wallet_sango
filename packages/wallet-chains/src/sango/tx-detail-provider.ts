import type { TxDetailProvider } from "../capabilities/tx-detail-provider";
import type { Address } from "../types/address";
import type { TxDetail, TxDetailPage } from "../types/tx-detail";
import type { SangoRpc } from "./rpc";

/**
 * Implémentation SANGO de `TxDetailProvider`.
 *
 * Forward direct vers les 2 méthodes RPC. Les types locaux
 * (`wallet-chains/types/tx-detail.ts`) sont structurellement
 * identiques à `@sango/rpc.Tx`/`TxPage` — la conversion est
 * implicite (pas de cast, pas de transformation).
 */
export class SangoTxDetailProvider implements TxDetailProvider {
  readonly #rpc: SangoRpc;

  constructor(rpc: SangoRpc) {
    this.#rpc = rpc;
  }

  async getTransactionByHash(hash: string): Promise<TxDetail | null> {
    return this.#rpc.getTransactionByHash(hash);
  }

  async getTransactionsByAddress(
    address: Address,
    limit: number,
    offset: number,
  ): Promise<TxDetailPage> {
    return this.#rpc.getTransactionsByAddress(address, limit, offset);
  }
}
