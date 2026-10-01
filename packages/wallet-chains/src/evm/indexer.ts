import type { Address } from "../types/address";

/**
 * Interface structurelle d'un indexeur EVM.
 *
 * **D-INDEXER-1** — `wallet-chains/evm` ne connaît NI Etherscan, NI
 * HTTP. Cette interface est le seul point d'entrée. Son implémentation
 * concrète (Etherscan V2) vit dans `wallet-providers/evm/`.
 *
 * Le but est de pouvoir remplacer Etherscan par un autre indexeur
 * (Blockscout, The Graph, indexeur maison) sans modifier l'API du
 * wallet.
 *
 * **D-INDEXER-4** — Retourne les transactions où l'adresse apparaît
 * côté `from` **ou** `to` (envoyées + reçues). L'UI décide de la
 * direction.
 *
 * **Hors scope E1.5** : transactions internes (nécessitent une source
 * supplémentaire).
 */
export interface EvmIndexerTx {
  /** Hash de la transaction (0x…, 32 bytes). */
  readonly hash: string;
  /** Hauteur du bloc contenant la tx. */
  readonly blockNumber: number;
  /** Timestamp Unix (secondes). */
  readonly timestamp: number;
  /** Adresse émettrice (0x…, 20 bytes). */
  readonly from: string;
  /** Adresse destinataire (null si contract creation). */
  readonly to: string | null;
  /** Montant transféré en wei (string décimale). */
  readonly value: string;
  /** Vrai si l'exécution a échoué (revert). */
  readonly isError: boolean;
}

export interface EvmIndexerPage {
  readonly total: number;
  readonly items: readonly EvmIndexerTx[];
}

export interface EvmIndexer {
  /**
   * Liste paginée des transactions touchant `address`.
   *
   * `limit` : nombre max d'items à retourner.
   * `offset` : index de départ (pagination).
   */
  getTransactionsByAddress(
    address: Address,
    limit: number,
    offset: number,
  ): Promise<EvmIndexerPage>;
}
