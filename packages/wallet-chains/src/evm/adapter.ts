import type { ChainAdapter } from "../registry/chain-adapter";
import type { Signer } from "../types/signer";
import { EvmAccountProvider } from "./account-provider";
import { EvmAddressProvider } from "./address-provider";
import { EvmBalanceProvider } from "./balance-provider";
import type { Network } from "../types/network";
import type { EvmRpc } from "./rpc";

/**
 * Dépendances injectées à l'adaptateur EVM.
 *
 * - `rpc`    : interface structurelle (viem + RpcPool en patch 3).
 * - `signer` : fournit la pubkey non-compressée (65 bytes) pour EVM.
 *
 * D-SIGNER-1 : le `Signer` route vers secp256k1 quand
 * `account.family === "evm"` (implémenté dans `MultiCurveSigner`,
 * patch 5). En patch 2, l'adapter suppose que le signer est compatible.
 */
export interface EvmAdapterDeps {
  readonly rpc: EvmRpc;
  readonly signer: Signer;
}

/**
 * Fabrique l'adaptateur EVM minimal (patch 2).
 *
 * **Capacités exposées** :
 *   - addressProvider  : dérivation + validation d'adresse Ethereum.
 *   - balanceProvider  : solde natif ETH.
 *   - accountProvider  : balance + nonce.
 *
 * **Non exposées en patch 2** :
 *   - historyProvider   (patch 4 — dépend de l'indexation EVM)
 *   - transactionBuilder / transactionSigner / broadcaster (patch 4)
 *   - feeEstimator      (patch 4)
 *   - stakingProvider / tokenProvider / txDetailProvider (post-E1)
 *
 * Le `historyProvider` est **obligatoire** dans `ChainAdapter`. En
 * attendant son implémentation (patch 4), on utilise un stub qui
 * retourne une page vide. C'est explicite et testable.
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
      // Stub — patch 4 remplacera par un vrai provider (via
      // eth_getLogs + indexation côté backend, ou explorer).
      getHistory: async () => ({ total: 0, items: [] }),
    },
    // transactionBuilder / transactionSigner / broadcaster /
    // feeEstimator / stakingProvider / tokenProvider / txDetailProvider
    // : absents jusqu'au patch 4.
  };
}
