import { mnemonicToSeed, mnemonicToSeedSync } from "./bip39";
import { deriveEvmKeypair, EVM_DEFAULT_PATH } from "./derivation";
import { deriveEthereumAddress } from "./secp256k1";
import {
  secp256k1SignDigest,
  secp256k1SignDigestRecoverable,
  secp256k1SignMessage,
} from "./secp256k1/keypair";
import {
  decryptBip39Secret,
  encryptBip39Secret,
  type StoredWalletV1,
  type StoredWalletV2,
} from "./storage";

const SEED_LENGTH = 64;

/**
 * Identité publique d'un compte EVM dérivé d'un `Bip39Wallet`.
 *
 * L'`index` correspond à un compte HD (BIP-44 index). Chaque compte a
 * sa propre adresse, dérivée via `m/44'/60'/0'/0/{index}`.
 */
export interface Bip39Identity {
  readonly index: number;
  readonly address: Uint8Array;
  readonly addressHex: string;
  readonly publicKeyCompressed: Uint8Array;
  /**
   * Clé publique non-compressée (65 bytes, préfixe 0x04).
   *
   * Requise par `EvmAddressProvider` (keccak256 des 64 bytes de X||Y).
   * Cf. `deriveEthereumAddress` dans wallet-core/secp256k1.
   */
  readonly publicKeyUncompressed: Uint8Array;
  readonly path: string;
}

function assertSeed(seed: Uint8Array): void {
  if (seed.length !== SEED_LENGTH) {
    throw new Error(
      `BIP-39 seed must be exactly ${SEED_LENGTH} bytes, got ${seed.length}`,
    );
  }
}

function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Wallet BIP-39 (multi-chaîne, EVM-first pour E1).
 *
 * **D-HD-1** : nouveau format, distinct du legacy `Wallet` (SANGO
 * Ed25519). Aucune conversion automatique entre les deux.
 *
 * **Mnemonic jetée** : la classe ne conserve que le seed BIP-39 (64
 * bytes). Aucune méthode ne retourne la mnemonic. L'UI doit afficher
 * la mnemonic à la création puis jeter sa référence.
 *
 * Le seed est stocké dans un champ privé `#seed` et effacé par
 * `destroy()`. Après destruction, toute opération de signature lève
 * une erreur.
 */
export class Bip39Wallet {
  readonly #seed: Uint8Array;
  #destroyed = false;

  private constructor(seed: Uint8Array) {
    this.#seed = seed;
  }

  // ── Factories ────────────────────────────────────────────────

  /**
   * Génère une nouvelle mnemonic + le wallet correspondant.
   *
   * La mnemonic est retournée à l'appelant — c'est la SEULE fois où
   * elle est accessible. L'appelant doit l'afficher puis jeter sa
   * référence.
   */
  static async generate(): Promise<{
    wallet: Bip39Wallet;
    mnemonic: string;
  }> {
    const { generateMnemonic } = await import("./bip39/mnemonic");
    const mnemonic = generateMnemonic(128);
    const wallet = await Bip39Wallet.fromMnemonic(mnemonic);
    return { wallet, mnemonic };
  }

  /** Reconstruit depuis une mnemonic BIP-39. */
  static async fromMnemonic(
    mnemonic: string,
    passphrase = "",
  ): Promise<Bip39Wallet> {
    const seed = await mnemonicToSeed(mnemonic, passphrase);
    return Bip39Wallet.fromSeed(seed);
  }

  /** Reconstruit depuis un seed BIP-39 (64 bytes). */
  static fromSeed(seed: Uint8Array): Bip39Wallet {
    assertSeed(seed);
    const copy = new Uint8Array(seed);
    return new Bip39Wallet(copy);
  }

  // ── Identity ─────────────────────────────────────────────────

  /** Dérive l'identité EVM pour l'index donné (0 par défaut). */
  getIdentity(index = 0): Bip39Identity {
    this.#assertAlive();
    const kp = deriveEvmKeypair(this.#seed, index);
    const address = deriveEthereumAddress(kp.publicKeyUncompressed);
    return {
      index,
      address,
      addressHex: toHex(address),
      publicKeyCompressed: new Uint8Array(kp.publicKeyCompressed),
      publicKeyUncompressed: new Uint8Array(kp.publicKeyUncompressed),
      path: index === 0
        ? EVM_DEFAULT_PATH
        : EVM_DEFAULT_PATH.replace(/\/\d+$/, `/${index}`),
    };
  }

  /** Adresse EVM par défaut (index 0). */
  get defaultAddress(): string {
    return this.getIdentity(0).addressHex;
  }

  // ── Signature (D-SIGNER-1 compatible) ────────────────────────

  /**
   * Signe `keccak256(domain || payload)`.
   *
   * Miroir de `Wallet.signDomain` (Ed25519), mais avec secp256k1 et un
   * hash keccak256 préalable (car secp256k1 signe un digest, pas un
   * message arbitraire).
   */
  async signDomain(
    domain: Uint8Array,
    payload: Uint8Array,
    index = 0,
  ): Promise<Uint8Array> {
    this.#assertAlive();
    const kp = deriveEvmKeypair(this.#seed, index);
    const message = new Uint8Array(domain.length + payload.length);
    message.set(domain, 0);
    message.set(payload, domain.length);
    return secp256k1SignMessage(kp, message);
  }

  /**
   * Signe un digest de 32 bytes (hash de tx EIP-1559 par exemple).
   *
   * Le digest est fourni déjà calculé — pas de re-hash.
   */
  async signDigest(digest: Uint8Array, index = 0): Promise<Uint8Array> {
    this.#assertAlive();
    if (digest.length !== 32) {
      throw new Error(`digest must be 32 bytes, got ${digest.length}`);
    }
    const kp = deriveEvmKeypair(this.#seed, index);
    return secp256k1SignDigest(kp, digest);
  }

  /**
   * Signe un digest 32 bytes et retourne la signature recoverable
   * (compact 64 bytes + recovery bit 0|1).
   *
   * Requis par l'adapter EVM (EIP-1559 yParity).
   */
  async signDigestRecoverable(
    digest: Uint8Array,
    index = 0,
  ): Promise<{ compact: Uint8Array; recovery: 0 | 1 }> {
    this.#assertAlive();
    if (digest.length !== 32) {
      throw new Error(`digest must be 32 bytes, got ${digest.length}`);
    }
    const kp = deriveEvmKeypair(this.#seed, index);
    return secp256k1SignDigestRecoverable(kp, digest);
  }

  // ── Persistence ─────────────────────────────────────────────

  async exportEncrypted(password: string): Promise<StoredWalletV2> {
    this.#assertAlive();
    const kp = deriveEvmKeypair(this.#seed, 0);
    const address = deriveEthereumAddress(kp.publicKeyUncompressed);
    return encryptBip39Secret({
      seed: this.#seed,
      address,
      password,
    });
  }

  static async importEncrypted(
    stored: StoredWalletV1 | StoredWalletV2,
    password: string,
  ): Promise<Bip39Wallet> {
    if (stored.version !== 2) {
      throw new Error(
        `Bip39Wallet.importEncrypted: expected version 2 (BIP-39), got ${stored.version}. ` +
          `Use Wallet.importEncrypted for SANGO legacy wallets.`,
      );
    }
    const { seed } = await decryptBip39Secret(stored, password);
    const wallet = Bip39Wallet.fromSeed(seed);
    seed.fill(0);
    return wallet;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new Error(
        "Bip39Wallet has been destroyed; the seed is no longer available",
      );
    }
  }

  destroy(): void {
    this.#seed.fill(0);
    this.#destroyed = true;
  }
}

/**
 * Variante sync de `Bip39Wallet.fromMnemonic` — utile pour les tests
 * et les contextes non-async.
 */
export function bip39WalletFromMnemonicSync(
  mnemonic: string,
  passphrase = "",
): Bip39Wallet {
  const seed = mnemonicToSeedSync(mnemonic, passphrase);
  return Bip39Wallet.fromSeed(seed);
}
