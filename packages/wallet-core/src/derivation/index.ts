export { parseBip44Path, formatBip44Path } from "./path";
export type { Bip44PathParts } from "./path";

export {
  EVM_PATH_PARTS,
  EVM_DEFAULT_PATH,
  deriveEvmKeypair,
} from "./evm";

export {
  BITCOIN_MAINNET_PATH_PARTS,
  BITCOIN_TESTNET_PATH_PARTS,
  encodeBitcoinP2WPKH,
  decodeBitcoinP2WPKHAddress,
  scriptPubKeyFromP2WPKHAddress,
  bitcoinP2WPKHScript,
  deriveBitcoinIdentity,
} from "./bitcoin";
export type { BitcoinNetwork, BitcoinIdentity } from "./bitcoin";
