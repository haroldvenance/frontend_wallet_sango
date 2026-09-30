import { HDKey } from "@scure/bip32";

import {
  secp256k1KeypairFromPrivateKey,
  type Secp256k1Keypair,
} from "../secp256k1/keypair";
import { formatBip44Path, type Bip44PathParts } from "./path";

export const EVM_PATH_PARTS: Bip44PathParts = Object.freeze({
  purpose: 44,
  coinType: 60,
  account: 0,
  change: 0,
  index: 0,
});

export const EVM_DEFAULT_PATH = formatBip44Path(EVM_PATH_PARTS);

export function deriveEvmKeypair(seed: Uint8Array, index = 0): Secp256k1Keypair {
  if (seed.length < 16) {
    throw new Error(`BIP-39 seed must be at least 16 bytes, got ${seed.length}`);
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid derivation index: ${index}`);
  }

  const parts: Bip44PathParts = { ...EVM_PATH_PARTS, index };
  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive(formatBip44Path(parts));

  if (!child.privateKey) {
    throw new Error("HDKey derivation did not produce a private key");
  }

  return secp256k1KeypairFromPrivateKey(child.privateKey);
}
