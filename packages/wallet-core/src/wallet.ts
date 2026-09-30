import * as ed25519 from "@noble/ed25519";

import { deriveNativeAddress, encodeNativeAddress } from "./address";
import { signNative, verifyNative, DOMAINS } from "./signing";
import type { Network } from "./types";
import {
  encodeUnsignedTransaction,
  type Transaction,
  type UnsignedTransaction,
} from "./serialization";
import {
  decryptWalletSecret,
  encryptWalletSecret,
  type StoredWalletV1,
  type StoredWalletV2,
} from "./storage";

const SEED_LENGTH = 32;

/** Identité publique d'un wallet — jamais le secret. */
export interface WalletIdentity {
  readonly publicKey: Uint8Array;
  readonly address: Uint8Array;
  readonly addressHex: string;
  readonly addressBech32: string;
  readonly network: Network;
}

function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function assertSeed(seed: Uint8Array): void {
  if (seed.length !== SEED_LENGTH) {
    throw new Error(`Ed25519 seed must be exactly ${SEED_LENGTH} bytes, got ${seed.length}`);
  }
}

/**
 * Wallet Sango.
 *
 * Le `secretKey` (seed Ed25519) vit **uniquement** dans ce champ privé
 * `#secretKey` et n'est jamais exposé via l'API publique. Toutes les
 * opérations cryptographiques passent par des méthodes de la classe.
 *
 * Après `destroy()`, toute opération qui touche au secret lance une
 * erreur — même si l'objet JS reste en mémoire. Cela permet aux tests
 * et aux composants UI de détecter un usage après destruction.
 */
export class Wallet {
  readonly #secretKey: Uint8Array;
  readonly #publicKey: Uint8Array;
  readonly #address: Uint8Array;
  readonly #network: Network;
  #destroyed = false;

  private constructor(
    secretKey: Uint8Array,
    publicKey: Uint8Array,
    address: Uint8Array,
    network: Network,
  ) {
    this.#secretKey = secretKey;
    this.#publicKey = publicKey;
    this.#address = address;
    this.#network = network;
  }

  static async create(network: Network = "mainnet"): Promise<Wallet> {
    const seed = ed25519.utils.randomSecretKey();
    return Wallet.fromSeed(seed, network);
  }

  static async fromSeed(seed: Uint8Array, network: Network = "mainnet"): Promise<Wallet> {
    assertSeed(seed);
    const secretKey = new Uint8Array(seed);
    const publicKey = await ed25519.getPublicKeyAsync(secretKey);
    const address = deriveNativeAddress(publicKey);
    return new Wallet(secretKey, publicKey, address, network);
  }

  get network(): Network {
    return this.#network;
  }

  get identity(): WalletIdentity {
    return Object.freeze({
      publicKey: new Uint8Array(this.#publicKey),
      address: new Uint8Array(this.#address),
      addressHex: toHex(this.#address),
      addressBech32: encodeNativeAddress(this.#address, this.#network),
      network: this.#network,
    });
  }

  /** Vrai si le wallet a été détruit (secret effacé). */
  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new Error("Wallet has been destroyed; the secret key is no longer available");
    }
  }

  async signTransaction(tx: UnsignedTransaction): Promise<Transaction> {
    this.#assertAlive();
    const unsigned = encodeUnsignedTransaction(tx);
    const signature = await signNative(this.#secretKey, DOMAINS.TX_V1, unsigned);
    return { ...tx, signature };
  }

  async signDomain(domain: Uint8Array, payload: Uint8Array): Promise<Uint8Array> {
    this.#assertAlive();
    return signNative(this.#secretKey, domain, payload);
  }

  async verifyOwnSignature(
    domain: Uint8Array,
    payload: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    return verifyNative(this.#publicKey, domain, payload, signature);
  }

  async exportEncrypted(password: string): Promise<StoredWalletV1> {
    this.#assertAlive();
    return encryptWalletSecret({
      secret: this.#secretKey,
      address: this.#address,
      network: this.#network,
      password,
    });
  }

  static async importEncrypted(
    stored: StoredWalletV1 | StoredWalletV2,
    password: string,
  ): Promise<Wallet> {
    if (stored.version !== 1) {
      throw new Error(
        `Wallet.importEncrypted: expected version 1 (SANGO legacy), got ${stored.version}. ` +
          `Use Bip39Wallet.importEncrypted for BIP-39 wallets.`,
      );
    }
    const { secret, network } = await decryptWalletSecret(stored, password);
    const wallet = await Wallet.fromSeed(secret, network);
    secret.fill(0);
    return wallet;
  }

  /**
   * Efface le secret et marque le wallet comme détruit.
   * Toute opération ultérieure qui utiliserait le secret lance une erreur.
   */
  destroy(): void {
    this.#secretKey.fill(0);
    this.#destroyed = true;
  }
}

export async function createWallet(network: Network = "mainnet"): Promise<Wallet> {
  return Wallet.create(network);
}

export async function restoreWallet(
  seed: Uint8Array,
  network: Network = "mainnet",
): Promise<Wallet> {
  return Wallet.fromSeed(seed, network);
}
