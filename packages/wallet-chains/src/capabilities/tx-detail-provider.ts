import type { Address } from "../types/address";
import type { TxDetail, TxDetailPage } from "../types/tx-detail";

/**
 * Capacité optionnelle : lecture détaillée des transactions.
 *
 * **D-SESS-9** — Séparée de `HistoryProvider` (vue universelle
 * account-centric) car elle expose des champs **SANGO-spécifiques**
 * (txKind, gas, signature, data) nécessaires à la page
 * `/history/:hash` (transaction viewer type Etherscan).
 *
 * Deux méthodes, deux sémantiques :
 * - `getTransactionByHash(hash)` : réseau-centric, n'importe qui peut
 *   consulter n'importe quelle tx.
 * - `getTransactionsByAddress(address, limit, offset)` : adresse-
 *   centric, historique émis par une adresse donnée (sender-indexed
 *   côté SANGO).
 *
 * L'adaptateur SANGO forward directement vers le RPC ; la compat
 * structurelle est vérifiée par rpc-compat.test.ts.
 */
export interface TxDetailProvider {
  /** Récupère une tx par son hash, ou `null` si inconnue. */
  getTransactionByHash(hash: string): Promise<TxDetail | null>;

  /**
   * Liste paginée des txs **émises** par une adresse.
   *
   * ⚠️ V0.3 : seules les txs natives sont indexées par sender côté
   *    Rust. Les txs EVM ne remontent pas encore dans cette méthode.
   */
  getTransactionsByAddress(
    address: Address,
    limit: number,
    offset: number,
  ): Promise<TxDetailPage>;
}
