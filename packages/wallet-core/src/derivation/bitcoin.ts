import { HDKey } from "@scure/bip32";
import { bech32 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";

import {
  secp256k1KeypairFromPrivateKey,
  type Secp256k1Keypair,
} from "../secp256k1/keypair";
import { formatBip44Path, type Bip44PathParts } from "./path";

/**
 * Dérivation Bitcoin BIP-84 (P2WPKH — native segwit `bc1q…` / `tb1q…`).
 *
 * **D-E2.1-1** — BIP-84 uniquement pour le MVP. Pas de BIP-49 (P2SH
 * `3…`) ni de BIP-44 legacy (P2PKH `1…`). Ce sont les formats
 * historiques ; les frais et la compatibilité sont meilleurs en
 * native segwit.
 *
 * **Coin type** : 0 pour mainnet, 1 pour testnet (convention BIP-44).
 * La structure du path :
 *
 *     m / 84' / coinType' / account' / change / index
 *       │      │              │        │      │
 *       │      │              │        │      └─ 0..∞ (non-hardened)
 *       │      │              │        └─ 0 = réception, 1 = change
 *       │      │              └─ 0 par défaut
 *       │      └─ 0 mainnet · 1 testnet
 *       └─ BIP-84
 *
 * **P2WPKH** : l'adresse est `bech32(hrp, [0, ...hash160(pubkey)])` :
 *   - HRP `bc` pour mainnet, `tb` pour testnet
 *   - witver = 0 (segwit v0), donc **bech32** (pas bech32m — c'est
 *     pour witver ≥ 1)
 *   - programme = RIPEMD160(SHA256(pubkey compressed))
 */

export type BitcoinNetwork = "mainnet" | "testnet";

/**
 * Parties fixes du path BIP-84 mainnet (coin type 0).
 */
export const BITCOIN_MAINNET_PATH_PARTS: Bip44PathParts = Object.freeze({
  purpose: 84,
  coinType: 0,
  account: 0,
  change: 0,
  index: 0,
});

/**
 * Parties fixes du path BIP-84 testnet (coin type 1).
 */
export const BITCOIN_TESTNET_PATH_PARTS: Bip44PathParts = Object.freeze({
  purpose: 84,
  coinType: 1,
  account: 0,
  change: 0,
  index: 0,
});

const MAINNET_HRP = "bc" as const;
const TESTNET_HRP = "tb" as const;

/**
 * Identité Bitcoin complète pour un couple (change, index).
 *
 * Expose à la fois les clés (pour signer en E2.1.b.4) et le
 * `scriptPubKey` P2WPKH (pour construire des outputs en E2.1.b.3).
 */
export interface BitcoinIdentity {
  /** Path BIP-84 formaté, ex. `m/84'/1'/0'/0/0`. */
  readonly path: string;
  readonly privateKey: Uint8Array;
  readonly publicKeyCompressed: Uint8Array;
  readonly publicKeyUncompressed: Uint8Array;
  /** Adresse P2WPKH (`bc1q…` / `tb1q…`). */
  readonly address: string;
  /**
   * Script `OP_0 <20-byte hash160>` (22 bytes).
   * Utilisé comme `scriptPubKey` d'un output P2WPKH.
   */
  readonly scriptPubKey: Uint8Array;
}

const SCRIPT_P2WPKH_LENGTH = 22;
const HASH160_LENGTH = 20;

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/**
 * Encode une clé publique compressed (33 bytes) en adresse P2WPKH
 * bech32. HRP `bc` (mainnet) ou `tb` (testnet).
 */
export function encodeBitcoinP2WPKH(
  publicKeyCompressed: Uint8Array,
  network: BitcoinNetwork,
): string {
  if (publicKeyCompressed.length !== 33) {
    throw new Error(
      `Bitcoin public key must be 33 bytes compressed, got ${publicKeyCompressed.length}`,
    );
  }
  const program = hash160(publicKeyCompressed);
  if (program.length !== HASH160_LENGTH) {
    throw new Error(`hash160 must be 20 bytes, got ${program.length}`);
  }
  const hrp = network === "mainnet" ? MAINNET_HRP : TESTNET_HRP;
  // BIP-173 : witness v0 → bech32 (pas bech32m).
  // `[0, ...toWords(program)]` = witver(0) + programme.
  const words = [0, ...bech32.toWords(program)];
  return bech32.encode(hrp, words);
}

/**
 * Construit le `scriptPubKey` P2WPKH : `0x00 0x14 <20 bytes>`.
 */
export function bitcoinP2WPKHScript(
  publicKeyCompressed: Uint8Array,
): Uint8Array {
  const program = hash160(publicKeyCompressed);
  const script = new Uint8Array(SCRIPT_P2WPKH_LENGTH);
  script[0] = 0x00; // OP_0 (witness v0)
  script[1] = 0x14; // push 20 bytes
  script.set(program, 2);
  return script;
}

/**
 * Dérive une identité Bitcoin complète depuis un seed BIP-39.
 *
 * @param seed    Seed BIP-39 (≥ 16 bytes, typiquement 64).
 * @param args.network  "mainnet" (coinType 0) ou "testnet" (coinType 1).
 * @param args.change   0 = réception, 1 = change.
 * @param args.index    Index non-hardened (0 par défaut).
 */
export function deriveBitcoinIdentity(
  seed: Uint8Array,
  args: {
    readonly network: BitcoinNetwork;
    readonly change: 0 | 1;
    readonly index?: number;
  },
): BitcoinIdentity {
  if (seed.length < 16) {
    throw new Error(`BIP-39 seed must be at least 16 bytes, got ${seed.length}`);
  }
  const index = args.index ?? 0;
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid derivation index: ${index}`);
  }
  if (args.change !== 0 && args.change !== 1) {
    throw new Error(`Invalid change value: ${args.change} (expected 0 or 1)`);
  }

  const base =
    args.network === "mainnet"
      ? BITCOIN_MAINNET_PATH_PARTS
      : BITCOIN_TESTNET_PATH_PARTS;

  const parts: Bip44PathParts = {
    ...base,
    change: args.change,
    index,
  };
  const path = formatBip44Path(parts);

  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive(path);
  if (!child.privateKey) {
    throw new Error("HDKey derivation did not produce a private key");
  }

  const keypair: Secp256k1Keypair = secp256k1KeypairFromPrivateKey(
    child.privateKey,
  );

  return {
    path,
    privateKey: keypair.privateKey,
    publicKeyCompressed: keypair.publicKeyCompressed,
    publicKeyUncompressed: keypair.publicKeyUncompressed,
    address: encodeBitcoinP2WPKH(keypair.publicKeyCompressed, args.network),
    scriptPubKey: bitcoinP2WPKHScript(keypair.publicKeyCompressed),
  };
}
