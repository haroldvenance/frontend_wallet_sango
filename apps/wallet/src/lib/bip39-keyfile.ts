import type { StoredWalletV2 } from "@sango/wallet-core";

export interface Bip39KeyfileV1 {
  readonly format: "sango-bip39-keyfile";
  readonly version: 1;
  readonly exportedAt: string;
  readonly networkId: string;
  readonly addressHex: string;
  readonly kdf: "PBKDF2-SHA256";
  readonly iterations: number;
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
}

const EXPECTED_CIPHERTEXT_LEN = 80; // seed 64 + tag 16
const MIN_ITERATIONS = 1_000;        // compat format, PAS sécurité
const MAX_ITERATIONS = 10_000_000;

export function serializeBip39Keyfile(
  stored: StoredWalletV2,
  networkId: string,
): Bip39KeyfileV1 {
  if (stored.version !== 2) {
    throw new Error("serializeBip39Keyfile: expected StoredWalletV2");
  }
  if (stored.format !== "bip39") {
    throw new Error("serializeBip39Keyfile: expected format 'bip39'");
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

export function deserializeBip39Keyfile(raw: unknown): {
  readonly stored: StoredWalletV2;
  readonly networkId: string;
} {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid file (not a JSON object)");
  }
  const o = raw as Record<string, unknown>;

  if (o.format !== "sango-bip39-keyfile") {
    throw new Error("Unknown format (expected sango-bip39-keyfile)");
  }
  if (o.version !== 1) {
    throw new Error("Unsupported version");
  }

  if (typeof o.networkId !== "string" || o.networkId.length === 0) {
    throw new Error("Invalid 'networkId'");
  }

  if (typeof o.addressHex !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(o.addressHex)) {
    throw new Error("Invalid 'addressHex'");
  }

  if (o.kdf !== "PBKDF2-SHA256") {
    throw new Error("Unsupported KDF");
  }

  const iterations = o.iterations;
  if (
    typeof iterations !== "number" ||
    !Number.isInteger(iterations) ||
    iterations < MIN_ITERATIONS ||
    iterations > MAX_ITERATIONS
  ) {
    throw new Error("Invalid 'iterations'");
  }

  const salt = strictHexToBytes(o.salt, "salt");
  const iv = strictHexToBytes(o.iv, "iv");
  const ciphertext = strictHexToBytes(o.ciphertext, "ciphertext");

  if (salt.length !== 16) throw new Error("Salt must be 16 bytes");
  if (iv.length !== 12) throw new Error("IV must be 12 bytes");
  if (ciphertext.length !== EXPECTED_CIPHERTEXT_LEN) {
    throw new Error(`Ciphertext must be ${EXPECTED_CIPHERTEXT_LEN} bytes`);
  }

  const stored: StoredWalletV2 = {
    version: 2,
    format: "bip39",
    network: "testnet",
    addressHex: o.addressHex,
    salt,
    iv,
    ciphertext,
    kdf: "PBKDF2-SHA256",
    iterations,
  };

  return { stored, networkId: o.networkId };
}

// ── Helpers hex stricts ────────────────────────────────────

function bytesToHex(u: Uint8Array): string {
  return Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Accepte une string hex (même longueur, [0-9a-fA-F] stricts) OU un
 * tableau d'entiers dans [0, 255].
 * Refuse : NaN, hex impair, caractères non-hex, bytes hors plage.
 */
function strictHexToBytes(v: unknown, name: string): Uint8Array {
  if (typeof v === "string") {
    if (v.length % 2 !== 0) {
      throw new Error(`Invalid '${name}': odd-length hex`);
    }
    if (!/^[0-9a-fA-F]*$/.test(v)) {
      throw new Error(`Invalid '${name}': non-hex characters`);
    }
    const out = new Uint8Array(v.length / 2);
    for (let i = 0; i < out.length; i += 1) {
      out[i] = Number.parseInt(v.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
  if (Array.isArray(v)) {
    const out = new Uint8Array(v.length);
    for (let i = 0; i < v.length; i += 1) {
      const n = v[i];
      if (
        typeof n !== "number" ||
        !Number.isInteger(n) ||
        n < 0 ||
        n > 255
      ) {
        throw new Error(`Invalid '${name}[${i}]': byte out of range`);
      }
      out[i] = n;
    }
    return out;
  }
  throw new Error(`Invalid '${name}'`);
}