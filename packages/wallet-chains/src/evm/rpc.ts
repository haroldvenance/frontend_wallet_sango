import type { Address } from "../types/address";

/**
 * Interface structurelle minimale du client RPC EVM.
 *
 * **D-EVM-1** — `wallet-chains/evm` ne connaît NI viem, NI RpcPool,
 * NI transport HTTP. Cette interface est le seul point d'entrée : son
 * implémentation concrète (viem + RpcPool) vivra dans
 * `wallet-providers/evm/` (patch 3).
 *
 * **Principe** : chaque méthode est ajoutée quand un provider en a
 * besoin — jamais en avance. Patch 2 n'a besoin que de 3 méthodes :
 *   - AddressProvider → aucune (dérivation offline)
 *   - BalanceProvider → getBalance
 *   - AccountProvider → getBalance + getTransactionCount
 *
 * Les transactions (builder/signer/broadcaster/fee) viendront en patch 4.
 */
export interface EvmRpc {
  /** ChainId décimal (11155111 pour Sepolia). */
  getChainId(): Promise<number>;

  /** Solde natif en wei (bigint). */
  getBalance(address: Address): Promise<bigint>;

  /** Nonce du compte (nombre de txs émises). */
  getTransactionCount(address: Address): Promise<number>;
}
