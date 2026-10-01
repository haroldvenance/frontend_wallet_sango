import type { StoredWalletV2 } from "@sango/wallet-core";

/**
 * Keyfile BIP-39 Sango — format propriétaire de backup/import.
 *
 * **D-E1.6-6** — Format séparé de `sango-wallet-keyfile` (V1 legacy
 * Ed25519). Les deux n'ont pas la même sémantique :
 *
 *   - `sango-wallet-keyfile` → seed Ed25519 32 bytes, dérivation
 *                              historique SANGO.
 *   - `sango-bip39-keyfile`  → seed BIP-39 64 bytes, dérivations HD
 *                              EVM (m/44'/60'/…).
 *
 * **Invariant D-HD-1** : le keyfile ne contient **jamais** de mnemonic,
 * même chiffrée. Seul le seed BIP-39 (chiffré AES-GCM-256 + PBKDF2)
 * est exporté. La mnemonic est uniquement une entrée de création/
 * import — elle n'est pas persistée.
 *
 * **Pas de compatibilité MetaMask** : `sango-bip39-keyfile` est un
 * format de sauvegarde/restauration pour ce wallet, pas un format
 * d'interopérabilité. Une future fonctionnalité « exporter la
 * mnemonic » serait conçue séparément avec des garanties de sécurité
 * fortes.
 *
 * **Métadonnées préservées** (non secrètes) :
 *   - `networkId` : identifiant canonique wallet-chains
 *     (`"ethereum-sepolia"`, `"ethereum-mainnet"`, `"base"`,
 *     `"arbitrum-one"`).
 *   - `addressHex` : adresse EVM par défaut (index BIP-44 0).
 *   - `kdf`, `iterations` : paramètres KDF.
 *   - `salt`, `iv` : paramètres cryptographiques.
 *   - `ciphertext` : seed BIP-39 chiffré (64 bytes + 16 bytes tag).
 */
export interface Bip39KeyfileV1 {
  readonly format: "sango-bip39-keyfile";
  readonly version: 1;
  /** ISO 8601 — date d'export (debug seulement). */
  readonly exportedAt: string;
  /** Identifiant canonique du réseau (ex. "ethereum-sepolia"). */
  readonly networkId: string;
  /** Adresse EVM par défaut (m/44'/60'/0'/0/0). */
  readonly addressHex: string;
  readonly kdf: "PBKDF2-SHA256";
  readonly iterations: number;
  /** 16 bytes hex (sans préfixe 0x). */
  readonly salt: string;
  /** 12 bytes hex (sans préfixe 0x). */
  readonly iv: string;
  /** Seed 64 bytes chiffré AES-GCM (64 + 16 tag = 80 bytes hex). */
  readonly ciphertext: string;
}

/**
 * Sérialise un `StoredWalletV2` (issu du keyring) en JSON-safe.
 *
 * Le blob chiffré est **déjà** dans le keyring (produit par
 * `Bip39Wallet.exportEncrypted(password)`). L'export ne nécessite
 * donc pas de re-demander le password — le destinataire aura besoin
 * du password pour l'utiliser.
 *
 * `networkId` vient du `KeyringEntry` (pas de `StoredWalletV2` qui
 * contient un placeholder D-NET-2 non significatif).
 */
export function serializeBip39Keyfile(
  stored: StoredWalletV2,
  networkId: string,
): Bip39KeyfileV1 {
  if (stored.version !== 2) {
    throw new Error(
      `serializeBip39Keyfile: expected StoredWalletV2, got version ${stored.version}`,
    );
  }
  if (stored.format !== "bip39") {
    throw new Error(
      `serializeBip39Keyfile: expected format "bip39", got "${stored.format}"`,
    );
  }
  return {
    format: "sango-bip39-keyfile",
    version: 1,
    exportedAt: new Date().toISOString(),
    networkId,
    addressHex: stored.addressHex,
    kdf: "PBKDF2-SHA256",
    iterations: stored.iterations,
    salt: bytesToHex(stored.salt),
    iv: bytesToHex(stored.iv),
    ciphertext: bytesToHex(stored.ciphertext),
  };
}

/**
 * Désérialise un JSON exporté en `{ stored: StoredWalletV2, networkId }`.
 *
 * Lance si le format ou la version sont invalides, ou si un champ est
 * manquant / mal formé.
 *
 * ⚠️ Le `StoredWalletV2.network` (label SANGO) est fixé à `"testnet"`
 *    comme placeholder D-NET-2 — le `networkId` du keyfile est le
 *    seul identifiant qui compte pour la reconstruction.
 */
export function deserializeBip39Keyfile(raw: unknown): {
  readonly stored: StoredWalletV2;
  readonly networkId: string;
} {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Fichier invalide (pas un objet JSON)");
  }
  const o = raw as Record<string, unknown>;

  if (o.format !== "sango-bip39-keyfile") {
    throw new Error(
      `Format inconnu — attendu : sango-bip39-keyfile (reçu : ${String(o.format)})`,
    );
  }
  if (o.version !== 1) {
    throw new Error(`Version non supportée : ${String(o.version)}`);
  }

  const networkId = o.networkId;
  if (typeof networkId !== "string" || networkId.length === 0) {
    throw new Error("Champ 'networkId' invalide");
  }

  const addressHex = o.addressHex;
  if (typeof addressHex !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(addressHex)) {
    throw new Error("Champ 'addressHex' invalide (attendu 0x + 40 hex)");
  }

  if (o.kdf !== "PBKDF2-SHA256") {
    throw new Error(`KDF non supporté : ${String(o.kdf)}`);
  }

  const iterations = o.iterations;
  if (typeof iterations !== "number" || iterations <= 0) {
    throw new Error("Champ 'iterations' invalide");
  }

  const salt = bytesFromHexField(o.salt, "salt");
  const iv = bytesFromHexField(o.iv, "iv");
  const ciphertext = bytesFromHexField(o.ciphertext, "ciphertext");

  // Contrôles de longueur (alignés sur storage.ts).
  if (salt.length !== 16) {
    throw new Error(`Salt doit faire 16 bytes, reçu ${salt.length}`);
  }
  if (iv.length !== 12) {
    throw new Error(`IV doit faire 12 bytes, reçu ${iv.length}`);
  }
  // AES-GCM ciphertext = seed (64) + tag (16) = 80 bytes.
  if (ciphertext.length !== 80) {
    throw new Error(
      `Ciphertext doit faire 80 bytes (seed 64 + tag 16), reçu ${ciphertext.length}`,
    );
  }

  // `StoredWalletV2.network` : placeholder D-NET-2 (label SANGO). Le
  // vrai réseau est `networkId` (canonique wallet-chains).
  const stored: StoredWalletV2 = {
    version: 2,
    format: "bip39",
    network: "testnet",
    addressHex,
    salt,
    iv,
    ciphertext,
    kdf: "PBKDF2-SHA256",
    iterations,
  };

  return { stored, networkId };
}

// ── Helpers hex ────────────────────────────────────────────

function bytesToHex(u: Uint8Array): string {
  return Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex impair");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesFromHexField(v: unknown, name: string): Uint8Array {
  if (typeof v === "string") return hexToBytes(v);
  if (Array.isArray(v)) return new Uint8Array(v as number[]);
  throw new Error(`Champ '${name}' invalide`);
}
