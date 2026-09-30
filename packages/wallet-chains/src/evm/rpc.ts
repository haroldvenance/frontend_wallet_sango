import type { Address, Hash } from "../types/address";

/**
 * Paramètres d'un appel `eth_estimateGas`.
 *
 * `to` est optionnel (contract deployment).
 */
export interface EvmCallParams {
  readonly from: Address;
  readonly to?: Address;
  readonly value?: bigint;
  readonly data?: Hash;
}

/**
 * Interface structurelle minimale du client RPC EVM.
 *
 * **D-EVM-1** — `wallet-chains/evm` ne connaît NI viem, NI RpcPool,
 * NI transport HTTP. Cette interface est le seul point d'entrée ; son
 * implémentation concrète (viem + RpcPool) vit dans
 * `wallet-providers/evm/`.
 *
 * **Principe** : chaque méthode est ajoutée quand un provider en a
 * besoin — jamais en avance.
 *
 * Patch 2 (lecture)  : getChainId, getBalance, getTransactionCount.
 * Patch 4 (écriture) : estimateGas, getBaseFeePerGas,
 *                      getMaxPriorityFeePerGas, sendRawTransaction.
 */
export interface EvmRpc {
  /** ChainId décimal (11155111 pour Sepolia). */
  getChainId(): Promise<number>;

  /** Solde natif en wei (bigint). */
  getBalance(address: Address): Promise<bigint>;

  /** Nonce du compte (nombre de txs émises). */
  getTransactionCount(address: Address): Promise<number>;

  // ── EIP-1559 (patch 4) ────────────────────────────────────

  /** Estimation `eth_estimateGas` en unités de gas (bigint). */
  estimateGas(tx: EvmCallParams): Promise<bigint>;

  /**
   * `baseFeePerGas` du bloc `latest` (wei par gas).
   *
   * Implémentation : `eth_getBlockByNumber("latest", false)` puis
   * extraction du champ `baseFeePerGas`.
   */
  getBaseFeePerGas(): Promise<bigint>;

  /** Tip suggéré `eth_maxPriorityFeePerGas` (wei par gas). */
  getMaxPriorityFeePerGas(): Promise<bigint>;

  /**
   * Broadcast `eth_sendRawTransaction`.
   *
   * @param raw La tx signée encodée (0x02 || rlp([...])).
   * @returns Le hash canonique de la tx.
   */
  sendRawTransaction(raw: Hash): Promise<Hash>;
}
