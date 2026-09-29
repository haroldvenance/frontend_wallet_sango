import type { ChainAdapter } from "../registry/chain-adapter";
import type { Signer } from "../types/signer";
import { SangoAccountProvider } from "./account-provider";
import { SangoAddressProvider } from "./address-provider";
import { SangoBalanceProvider } from "./balance-provider";
import { SangoBroadcaster } from "./broadcaster";
import type { SangoNetwork } from "./config";
import { SangoFeeEstimator } from "./fee-estimator";
import { SangoHistoryProvider } from "./history-provider";
import type { SangoRpc } from "./rpc";
import { SangoTransactionBuilder } from "./transaction-builder";
import { SangoTransactionSigner } from "./transaction-signer";

/**
 * Dépendances injectées à l'adaptateur SANGO.
 *
 * D-RPC-1 : pas de `ProviderDeps` générique en V0 (un seul transport).
 */
export interface SangoAdapterDeps {
  readonly rpc: SangoRpc;
  readonly signer: Signer;
}

/**
 * Fabrique l'adaptateur SANGO complet.
 *
 * V0-D2 : le `Signer` est injecté dans `SangoAddressProvider` via
 * constructeur. Le provider ne peut pas exister sans signer.
 */
export function sangoAdapterFactory(
  network: SangoNetwork,
  deps: SangoAdapterDeps,
): ChainAdapter {
  return {
    network,
    addressProvider: new SangoAddressProvider(deps.signer),
    accountProvider: new SangoAccountProvider(deps.rpc),
    balanceProvider: new SangoBalanceProvider(deps.rpc, network.id),
    historyProvider: new SangoHistoryProvider(deps.rpc, network.id),
    transactionBuilder: new SangoTransactionBuilder(
      deps.rpc,
      network.id,
      network.chainId,
      network.bech32Network,
    ),
    transactionSigner: new SangoTransactionSigner(),
    broadcaster: new SangoBroadcaster(deps.rpc),
    feeEstimator: new SangoFeeEstimator(deps.rpc, network.id),
    // tokenProvider : absent en V0.
  };
}
