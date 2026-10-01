import type { KeyringEntry } from "@sango/wallet-core";
import type { KeyringLike } from "../accounts";
import type { StoredWallet } from "@sango/wallet-core";

/** KeyringLike en mémoire — pas d'IndexedDB en test. */
export class FakeKeyring implements KeyringLike {
  readonly #store = new Map<string, KeyringEntry>();

  async list(): Promise<readonly KeyringEntry[]> {
    return Array.from(this.#store.values());
  }
  async get(id: string): Promise<KeyringEntry | null> {
    return this.#store.get(id) ?? null;
  }
  async put(entry: KeyringEntry): Promise<void> {
    this.#store.set(entry.id, entry);
  }
  async remove(id: string): Promise<void> {
    this.#store.delete(id);
  }
}

export function fakeEntry(
  id = "0x" + "aa".repeat(20),
  label = "Alice",
  createdAt = 1_700_000_000_000,
): KeyringEntry {
  const stored: StoredWallet = {
    version: 1,
    network: "testnet",
    addressHex: id,
    salt: new Uint8Array(16),
    iv: new Uint8Array(12),
    ciphertext: new Uint8Array(48),
    kdf: "PBKDF2-SHA256",
    iterations: 600_000,
  };
  return {
    id,
    label,
    format: "sango-legacy",
    networkId: "sango-devnet",
    stored,
    createdAt,
  };
}
