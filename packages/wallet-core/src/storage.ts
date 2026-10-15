import type { Network } from "./types";

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KDF_ITERATIONS = 600_000;

/**
 * Wallet sérialisé et chiffré.
 *
 * Le champ `ciphertext` contient le seed Ed25519 (32 bytes) chiffré en
 * AES-GCM 256 avec une clé dérivée par PBKDF2-SHA256.
 *
 * Ce format est **local au frontend** : il n'est pas envoyé au réseau et
 * n'est pas sujet à un consensus.
 */
export interface StoredWalletV1 {
  readonly version: 1;
  readonly network: Network;
  readonly addressHex: string;
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly kdf: "PBKDF2-SHA256";
  readonly iterations: number;
}

/**
 * StoredWalletV2 — format BIP-39 (E1+).
 *
 * D-HD-1 : nouveau format, distinct du V1 legacy SANGO. Le `secret`
 * chiffré fait **64 bytes** (BIP-39 seed) au lieu de 32 (Ed25519).
 *
 * ⚠️ D-NET-2 (reporté au patch 5) — le champ `network` est un
 *    **placeholder** :
 *
 *      Le type `@sango/types.Network = "mainnet" | "testnet"` est un
 *      discriminant SANGO pour le HRP bech32m (`sango` vs `tsango`).
 *      Un wallet BIP-39 (EVM) n'a pas de réseau SANGO — il utilise
 *      `wallet-chains.Network` (`"ethereum-sepolia"` etc.), qui est
 *      un objet descripteur multi-chaîne.
 *
 *      Ces deux `Network` coexistent. En V2, on stocke `"testnet"`
 *      pour satisfaire `KeyringEntry.network` (obligatoire) et
 *      permettre l'indexation keyring. Aucun code ne lit cette valeur
 *      pour un choix fonctionnel.
 *
 *      Le patch 5 (app intégration) introduira :
 *        - soit un `WalletNetwork` discriminant (`format: "sango-legacy"
 *          | "bip39"` + `networkId: string`),
 *        - soit une refonte du `KeyringEntry`.
 *
 *      En attendant, `"testnet"` est l'équivalent d'un `null` typé.
 */
export interface StoredWalletV2 {
  readonly version: 2;
  readonly format: "bip39";
  readonly network: Network;
  readonly addressHex: string;
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  /** Chiffre 64 bytes (BIP-39 seed). */
  readonly ciphertext: Uint8Array;
  readonly kdf: "PBKDF2-SHA256";
  readonly iterations: number;
}

/**
 * Union discriminée par `version`.
 *
 * Compatible avec le code legacy qui lisait `StoredWallet` : tous les
 * champs V1 sont présents, et V2 en ajoute `format`.
 */
export type StoredWallet = StoredWalletV1 | StoredWalletV2;

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "WebCrypto SubtleCrypto indisponible. Utilisez Node ≥ 20 ou un navigateur moderne.",
    );
  }
  return subtle;
}

function getRandomBytes(length: number): Uint8Array {
  const c = globalThis.crypto;
  if (!c?.getRandomValues) {
    throw new Error("CSPRNG indisponible (globalThis.crypto.getRandomValues).");
  }
  return c.getRandomValues(new Uint8Array(length));
}

/**
 * Petit utilitaire pour satisfaire le typage strict `BufferSource`
 * de WebCrypto (TS ≥ 5.7 a rendu `Uint8Array` générique sur
 * `ArrayBufferLike`, ce qui le rend incompatible avec `ArrayBufferView<ArrayBuffer>`
 * sans cast explicite). À l'exécution, `Uint8Array` EST un `BufferSource`.
 */
function bs(u: Uint8Array): BufferSource {
  return u as BufferSource;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const pwBytes = new TextEncoder().encode(password);
  const baseKey = await subtle.importKey(
    "raw",
    bs(pwBytes),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: bs(salt),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Inverse de `toHex` — accepte avec ou sans préfixe `0x`. */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`hexToBytes: odd-length hex string (${hex.length} chars)`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`hexToBytes: invalid hex character in "${hex}"`);
    }
    out[i] = byte;
  }
  return out;
}

/**
 * Chiffre un seed avec un mot de passe.
 *
 * ⚠️ Ne pas appeler directement depuis un composant React — passer par
 *    `Wallet.exportEncrypted(password)`.
 */
export async function encryptWalletSecret(args: {
  secret: Uint8Array;
  address: Uint8Array;
  network: Network;
  password: string;
}): Promise<StoredWalletV1> {
  if (args.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const subtle = getSubtle();
  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);
  const key = await deriveKey(args.password, salt, KDF_ITERATIONS);
  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      { name: "AES-GCM", iv: bs(iv) },
      key,
      bs(args.secret),
    ),
  );
  return {
    version: 1,
    network: args.network,
    addressHex: toHex(args.address),
    salt,
    iv,
    ciphertext,
    kdf: "PBKDF2-SHA256",
    iterations: KDF_ITERATIONS,
  };
}

/**
 * Déchiffre un seed avec un mot de passe.
 *
 * Lance une erreur si le mot de passe est faux ou si le blob est
 * corrompu (AES-GCM authentifie le ciphertext).
 */
export async function decryptWalletSecret(
  stored: StoredWalletV1,
  password: string,
): Promise<{ secret: Uint8Array; network: Network }> {
  if (stored.version !== 1) {
    throw new Error(`Unsupported wallet version: ${stored.version}`);
  }
  if (stored.kdf !== "PBKDF2-SHA256") {
    throw new Error(`Unsupported KDF: ${stored.kdf}`);
  }
  const subtle = getSubtle();
  const key = await deriveKey(password, stored.salt, stored.iterations);
  let plain: ArrayBuffer;
  try {
    plain = await subtle.decrypt(
      { name: "AES-GCM", iv: bs(stored.iv) },
      key,
      bs(stored.ciphertext),
    );
  } catch {
    throw new Error("Invalid password or corrupted wallet");
  }
  return { secret: new Uint8Array(plain), network: stored.network };
}


// ── E1 : persistance BIP-39 (StoredWalletV2) ────────────────────────

/**
 * Chiffre un seed BIP-39 (64 bytes).
 *
 * Format V2, discriminant par `version: 2`. Ne PAS confondre avec
 * `encryptWalletSecret` (V1, 32 bytes SANGO legacy).
 *
 * ⚠️ `network` est fixé à "testnet" — voir StoredWalletV2. À rendre
 *    paramétrable au patch 5 quand l'UI multi-chaîne existera.
 */
export async function encryptBip39Secret(args: {
  seed: Uint8Array;
  address: Uint8Array;
  password: string;
}): Promise<StoredWalletV2> {
  if (args.seed.length !== 64) {
    throw new Error(
      `BIP-39 seed must be exactly 64 bytes, got ${args.seed.length}`,
    );
  }
  if (args.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const subtle = getSubtle();
  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);
  const key = await deriveKey(args.password, salt, KDF_ITERATIONS);
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, key, bs(args.seed)),
  );
  return {
    version: 2,
    format: "bip39",
    network: "testnet",
    addressHex: toHex(args.address),
    salt,
    iv,
    ciphertext,
    kdf: "PBKDF2-SHA256",
    iterations: KDF_ITERATIONS,
  };
}

/**
 * Déchiffre un seed BIP-39 (64 bytes).
 *
 * Rejette tout ce qui n'est pas `version: 2` (utiliser
 * `decryptWalletSecret` pour les V1 legacy).
 */
export async function decryptBip39Secret(
  stored: StoredWalletV2,
  password: string,
): Promise<{ seed: Uint8Array }> {
  if (stored.version !== 2) {
    throw new Error(`Unsupported wallet version: ${stored.version}`);
  }
  if (stored.format !== "bip39") {
    throw new Error(`Unsupported format: ${stored.format}`);
  }
  if (stored.kdf !== "PBKDF2-SHA256") {
    throw new Error(`Unsupported KDF: ${stored.kdf}`);
  }
  const subtle = getSubtle();
  const key = await deriveKey(password, stored.salt, stored.iterations);
  let plain: ArrayBuffer;
  try {
    plain = await subtle.decrypt(
      { name: "AES-GCM", iv: bs(stored.iv) },
      key,
      bs(stored.ciphertext),
    );
  } catch {
    throw new Error("Invalid password or corrupted wallet");
  }
  const seed = new Uint8Array(plain);
  if (seed.length !== 64) {
    throw new Error(
      `Decrypted BIP-39 seed must be 64 bytes, got ${seed.length}`,
    );
  }
  return { seed };
}

// ── Phase 11.2 : ré-encryption (changement de mot de passe) ─────────

/**
 * Ré-encrypte un blob chiffré avec un nouveau mot de passe.
 *
 * **Invariants** :
 *   - `version`, `format`, `network`, `addressHex`, `kdf`, `iterations`
 *     sont **préservés** à l'identique.
 *   - `salt` et `iv` sont **toujours régénérés** — réutiliser un IV
 *     AES-GCM avec une clé dérivée différente viole la spec NIST et
 *     casse la sécurité.
 *   - Le secret déchiffré est **zéroïsé** dans un `finally` (pas de
 *     trace en mémoire après retour).
 *   - Lance `Error("Invalid password or corrupted wallet")` si
 *     `currentPassword` est faux (via tag d'auth AES-GCM).
 *
 * ⚠️ Fait un déchiffrement **et** un chiffrement complets
 *    (~1.2 M itérations PBKDF2 sur 600k × 2). Coût ≈ 2 déverrouillages.
 */
export async function reencryptStoredWallet(
  stored: StoredWallet,
  currentPassword: string,
  newPassword: string,
): Promise<StoredWallet> {
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  if (stored.version === 1) {
    const { secret, network } = await decryptWalletSecret(
      stored,
      currentPassword,
    );
    try {
      return await encryptWalletSecret({
        secret,
        address: hexToBytes(stored.addressHex),
        network,
        password: newPassword,
      });
    } finally {
      secret.fill(0);
    }
  }

  if (stored.version === 2) {
    const { seed } = await decryptBip39Secret(stored, currentPassword);
    try {
      const fresh = await encryptBip39Secret({
        seed,
        address: hexToBytes(stored.addressHex),
        password: newPassword,
      });
      // `encryptBip39Secret` hardcode `network: "testnet"` — on
      // restaure la valeur d'origine pour préserver le champ.
      return { ...fresh, network: stored.network };
    } finally {
      seed.fill(0);
    }
  }

  throw new Error(
    `reencryptStoredWallet: unsupported version ${(stored as { version: number }).version}`,
  );
}

