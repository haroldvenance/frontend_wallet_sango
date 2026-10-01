import type { StoredWallet } from "./storage";
import type { WalletFormat } from "./wallet-format";

const DB_NAME = "sango-wallet";
const DB_VERSION = 1;
const STORE = "wallets";

/**
 * Entrée stockée dans le keyring (métadonnées + blob chiffré).
 *
 * ⚠️ Ne contient **jamais** de secret en clair — uniquement le blob
 *    AES-GCM produit par `storage.ts`.
 *
 * **D-NET-2 (résolue en patch 5)** — ancien schéma `network: Network`
 * (label SANGO `"mainnet" | "testnet"`) remplacé par :
 *   - `format`    : discriminant de construction (SANGO legacy vs BIP-39).
 *   - `networkId` : identifiant canonique wallet-chains
 *                   (`"sango-devnet"`, `"ethereum-sepolia"`, …).
 *
 * Le label SANGO `"testnet"` reste calculable depuis le format si
 * besoin (`resolveSangoNetworkId`), mais n'est plus stocké.
 */
export interface KeyringEntry {
  /** Identifiant unique = adresse hex lowercase. */
  readonly id: string;
  /** Label utilisateur (« Alice », « Compte principal »…). */
  readonly label: string;
  /** Format de construction du wallet (D-HD-1). */
  readonly format: WalletFormat;
  /**
   * Identifiant canonique du réseau wallet-chains.
   *   - `"sango-devnet"` (legacy SANGO, défaut devnet)
   *   - `"ethereum-sepolia"` (BIP-39 EVM)
   */
  readonly networkId: string;
  /** Blob chiffré (salt + iv + ciphertext). */
  readonly stored: StoredWallet;
  /** Timestamp de création (ms epoch). */
  readonly createdAt: number;
}

/**
 * Petit wrapper minimal autour d'IndexedDB.
 *
 * Aucune dépendance externe. Le schéma est :
 *
 *   db `sango-wallet`
 *     └─ objectStore `wallets` (keyPath = "id")
 */
export class Keyring {
  readonly #db: IDBDatabase;

  private constructor(db: IDBDatabase) {
    this.#db = db;
  }

  /** Ouvre (ou crée) la base. */
  static async open(): Promise<Keyring> {
    const indexedDB = globalThis.indexedDB;
    if (!indexedDB) throw new Error("IndexedDB indisponible dans cet environnement");

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    });

    return new Keyring(db);
  }

  /** Liste les entrées (sans les blobs en pratique — mais ils sont chargés). */
  list(): Promise<KeyringEntry[]> {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as KeyringEntry[]);
      req.onerror = () => reject(req.error);
    });
  }

  get(id: string): Promise<KeyringEntry | null> {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as KeyringEntry) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  put(entry: KeyringEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  remove(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  close(): void {
    this.#db.close();
  }
}
