export {
  BITCOIN_TESTNET,
  ALL_BITCOIN_NETWORKS,
  DEFAULT_BITCOIN_NETWORK_ID,
  bitcoinNetworkById,
} from "./config";

export {
  BITCOIN_NATIVE_ASSET_ID,
  BITCOIN_DECIMALS,
  SATOSHIS_PER_BTC,
} from "./constants";

export type { BitcoinRpc, Utxo, BitcoinFeeRates } from "./rpc";
export { BitcoinUtxoProvider } from "./utxo-provider";
export { BitcoinFeeRateProvider } from "./fee-rate-provider";
export { BitcoinBalanceProvider } from "./balance-provider";

export {
  estimateP2WPKHVsize,
  BITCOIN_DUST_LIMIT,
} from "./vsize";

export {
  selectUtxosGreedy,
  InsufficientFundsError,
} from "./utxo-selector";
export type { UtxoSelectionResult } from "./utxo-selector";

export type {
  BitcoinChangeAddress,
  BitcoinChangeAddressProvider,
} from "./change-address-provider";

export {
  BitcoinTransactionBuilder,
} from "./transaction-builder";
export type {
  BitcoinTransactionBuilderDeps,
  BitcoinUnsignedPayload,
} from "./transaction-builder";

export { BitcoinTransactionSigner } from "./transaction-signer";
