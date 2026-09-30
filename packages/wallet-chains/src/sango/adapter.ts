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
import { SangoStakingProvider } from "./staking-provider";
import { SangoTransactionBuilder } from "./transaction-builder";
import { SangoTxDetailProvider } from "./tx-detail-provider";
import { SangoTransactionSigner } from "./transaction-signer";

export interface SangoAdapterDeps {
  readonly rpc: SangoRpc;
  readonly signer: Signer;
}

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
    stakingProvider: new SangoStakingProvider(deps.rpc),
    txDetailProvider: new SangoTxDetailProvider(deps.rpc),
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
