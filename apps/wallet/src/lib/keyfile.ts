import type { StoredWalletV1, Network } from "@sango/wallet-core";

export interface SerializedStoredWallet {
  readonly version: 1;
  readonly network: Network;
  readonly addressHex: string;
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
  readonly kdf: "PBKDF2-SHA256";
  readonly iterations: number;
}

export interface KeyfileExport {
  readonly format: "sango-wallet-keyfile";
  readonly version: 1;
  readonly exportedAt: string;
  readonly network: Network;
  readonly addressHex: string;
  readonly stored: SerializedStoredWallet;
}

const EXPECTED_CIPHERTEXT_LEN = 48; // seed Ed25519 32 + tag 16
const MIN_ITERATIONS = 1_000;        // compat format, PAS sécurité
const MAX_ITERATIONS = 10_000_000;
const MAX_FILE_BYTES = 100 * 1024; // 100 KB

function isNetwork(v: unknown): v is Network {
  return v === "mainnet" || v === "testnet";
}

export function serializeKeyfile(stored: StoredWalletV1): KeyfileExport {
  return {
    format: "sango-wallet-keyfile",
    version: 1,
    exportedAt: new Date().toISOString(),
    network: stored.network,
    addressHex: stored.addressHex,
    stored: {
      version: stored.version,
      network: stored.network,
      addressHex: stored.addressHex,
      salt: bytesToHex(stored.salt),
      iv: bytesToHex(stored.iv),
      ciphertext: bytesToHex(stored.ciphertext),
      kdf: stored.kdf,
      iterations: stored.iterations,
    },
  };
}

export function deserializeKeyfile(raw: unknown): StoredWalletV1 {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid file (not a JSON object)");
  }
  const o = raw as Record<string, unknown>;

  if (o.format !== "sango-wallet-keyfile") {
    throw new Error("Unknown format (expected sango-wallet-keyfile)");
  }
  if (o.version !== 1) {
    throw new Error("Unsupported version");
  }

  const s = o.stored;
  if (typeof s !== "object" || s === null) {
    throw new Error("Missing 'stored' block");
  }
  const ss = s as Record<string, unknown>;

  if (!isNetwork(ss.network)) {
    throw new Error("Invalid 'network'");
  }
  if (
    typeof ss.addressHex !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(ss.addressHex)
  ) {
    throw new Error("Invalid 'addressHex'");
  }
  if (ss.kdf !== "PBKDF2-SHA256") {
    throw new Error("Unsupported KDF");
  }
  if (
    typeof ss.iterations !== "number" ||
    !Number.isInteger(ss.iterations) ||
    ss.iterations < MIN_ITERATIONS ||
    ss.iterations > MAX_ITERATIONS
  ) {
    throw new Error("Invalid 'iterations'");
  }

  const salt = strictHexToBytes(ss.salt, "salt");
  const iv = strictHexToBytes(ss.iv, "iv");
  const ciphertext = strictHexToBytes(ss.ciphertext, "ciphertext");

  if (salt.length !== 16) throw new Error("Salt must be 16 bytes");
  if (iv.length !== 12) throw new Error("IV must be 12 bytes");
  if (ciphertext.length !== EXPECTED_CIPHERTEXT_LEN) {
    throw new Error(`Ciphertext must be ${EXPECTED_CIPHERTEXT_LEN} bytes`);
  }

  return {
    version: 1,
    network: ss.network,
    addressHex: ss.addressHex,
    salt,
    iv,
    ciphertext,
    kdf: "PBKDF2-SHA256",
    iterations: ss.iterations,
  };
}

// ── Helpers hex stricts ────────────────────────────────────

function bytesToHex(u: Uint8Array): string {
  return Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
}

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

// ── IO ────────────────────────────────────────────────────

export function downloadJson(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickJsonFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        settle(() => reject(new Error("No file selected")));
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        settle(() =>
          reject(new Error("File too large (max 100 KB)")),
        );
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        settle(() => resolve(parsed));
      } catch {
        // Jamais `(e as Error).message` — peut contenir un chemin ou
        // un offset de parse.
        settle(() => reject(new Error("File read failed")));
      }
    };

    input.oncancel = () => {
      settle(() => reject(new Error("Selection cancelled")));
    };

    input.click();

    setTimeout(() => {
      settle(() => reject(new Error("Selection timed out")));
    }, 5 * 60 * 1000);
  });
}