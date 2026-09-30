import type { ChainAdapter } from "../registry/chain-adapter";
import type { Network } from "../types/network";
import type { Signer } from "../types/signer";
import { EvmAccountProvider } from "./account-provider";
import { EvmAddressProvider } from "./address-provider";
import { EvmBalanceProvider } from "./balance-provider";
import { EvmBroadcaster } from "./broadcaster";
import { EvmFeeEstimator } from "./fee-estimator";
import type { EvmRpc } from "./rpc";
import { EvmTransactionBuilder } from "./transaction-builder";
import { EvmTransactionSigner } from "./transaction-signer";

/**
 * Dépendances injectées à l'adaptateur EVM.
 *
 * - `rpc`      : interface structurelle (implémentée par
 *                `EvmRpcUsingPool` dans wallet-providers).
 * - `signer`   : fournit la pubkey non-compressée (65 bytes) et — en
 *                patch 4+ — `signDigestRecoverable` (EIP-1559 yParity).
 * - `chainId`  : chaîne EVM cible (11155111 pour Sepolia).
 */
export interface EvmAdapterDeps {
  readonly rpc: EvmRpc;
  readonly signer: Signer;
  readonly chainId: number;
}

/**
 * Fabrique l'adaptateur EVM complet (patch 4).
 *
 * Capacités exposées :
 *   - addressProvider, balanceProvider, accountProvider (patch 2)
 *   - feeEstimator, transactionBuilder, transactionSigner,
 *     broadcaster (patch 4)
 *
 * Capacités absentes (reportées) :
 *   - historyProvider (stub page vide — indexation EVM post-E1)
 *   - stakingProvider (pas de staking EVM en E1)
 *   - tokenProvider   (ERC-20 post-E1)
 *   - txDetailProvider (post-E1)
 */
export function evmAdapterFactory(
  network: Network,
  deps: EvmAdapterDeps,
): ChainAdapter {
  if (network.family !== "evm") {
    throw new Error(
      `evmAdapterFactory: expected family "evm", got "${network.family}"`,
    );
  }
  return {
    network,
    addressProvider: new EvmAddressProvider(deps.signer),
    balanceProvider: new EvmBalanceProvider(deps.rpc, network.id),
    accountProvider: new EvmAccountProvider(deps.rpc, network.id),
    historyProvider: {
      getHistory: async () => ({ total: 0, items: [] }),
    },
    feeEstimator: new EvmFeeEstimator(deps.rpc, network.id),
    transactionBuilder: new EvmTransactionBuilder(
      deps.rpc,
      network.id,
      deps.chainId,
    ),
    transactionSigner: new EvmTransactionSigner(),
    broadcaster: new EvmBroadcaster(deps.rpc),
  };
}
