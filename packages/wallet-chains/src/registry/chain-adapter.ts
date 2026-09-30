import type { AccountProvider } from "../capabilities/account-provider";
import type { AddressProvider } from "../capabilities/address-provider";
import type { BalanceProvider } from "../capabilities/balance-provider";
import type { Broadcaster } from "../capabilities/broadcaster";
import type { FeeEstimator } from "../capabilities/fee-estimator";
import type { HistoryProvider } from "../capabilities/history-provider";
import type { StakingProvider } from "../capabilities/staking-provider";
import type { TokenProvider } from "../capabilities/token-provider";
import type { TransactionBuilder } from "../capabilities/transaction-builder";
import type { TransactionSigner } from "../capabilities/transaction-signer";
import type { Network } from "../types/network";

export interface ChainAdapter {
  readonly network: Network;

  readonly addressProvider: AddressProvider;
  readonly balanceProvider: BalanceProvider;
  readonly historyProvider: HistoryProvider;

  readonly accountProvider?: AccountProvider;
  readonly stakingProvider?: StakingProvider;

  readonly transactionBuilder?: TransactionBuilder;
  readonly transactionSigner?: TransactionSigner;
  readonly broadcaster?: Broadcaster;
  readonly feeEstimator?: FeeEstimator;
  readonly tokenProvider?: TokenProvider;
}
