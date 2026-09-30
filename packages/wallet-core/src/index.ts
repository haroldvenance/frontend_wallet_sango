export type { Ed25519Keypair, Hex, Network } from "./types";

export { generateKeypair, keypairFromSeed, sign } from "./keypair";

export {
  decodeNativeAddress,
  tryDecodeAnyNetwork,
  deriveNativeAddress,
  encodeNativeAddress,
  nativeAddressToHex,
} from "./address";

export {
  DOMAINS,
  signNative,
  verifyNative,
  signTransactionPayload,
  verifyTransactionSignature,
  signProposalPayload,
  signPrevotePayload,
  signPrecommitPayload,
} from "./signing";
export type { DomainName } from "./signing";

export {
  BASE_UNITS_PER_SANGO,
  Reader,
  Writer,
  decodeTransaction,
  encodeTransaction,
  encodeUnsignedTransaction,
  sangoToBaseUnits,
  baseUnitsToSango,
  transactionHash,
  TX_KIND,
} from "./serialization";
export type { Transaction, TxKind, UnsignedTransaction } from "./serialization";

export { createWallet, restoreWallet, Wallet } from "./wallet";
export type { WalletIdentity } from "./wallet";

export { decryptWalletSecret, encryptWalletSecret } from "./storage";
export type { StoredWallet } from "./storage";

export { Keyring } from "./keyring";
export type { KeyringEntry } from "./keyring";

// ── E1 : primitives EVM (secp256k1, BIP-39, BIP-44) ──────────────

export {
  secp256k1KeypairFromPrivateKey,
  secp256k1SignDigest,
  secp256k1SignMessage,
  secp256k1Verify,
  deriveEthereumAddress,
} from "./secp256k1";
export type { Secp256k1Keypair } from "./secp256k1";

export {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  mnemonicToSeedSync,
} from "./bip39";
export type { MnemonicStrength } from "./bip39";

export {
  parseBip44Path,
  formatBip44Path,
  EVM_PATH_PARTS,
  EVM_DEFAULT_PATH,
  deriveEvmKeypair,
} from "./derivation";
export type { Bip44PathParts } from "./derivation";

// ── E1 : Bip39Wallet + StoredWalletV2 ────────────────────────────

export { Bip39Wallet, bip39WalletFromMnemonicSync } from "./bip39-wallet";
export type { Bip39Identity } from "./bip39-wallet";

export {
  encryptBip39Secret,
  decryptBip39Secret,
} from "./storage";
export type { StoredWalletV1, StoredWalletV2 } from "./storage";
