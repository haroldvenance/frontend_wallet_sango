import type { KeyringEntry } from "@sango/wallet-core";
import type { AccountRef } from "@sango/wallet-chains";

/**
 * Sous-ensemble structurel de `Keyring` (wallet-core) utilisé par la
 * session. `Keyring` le satisfait tel quel, et les tests peuvent
 * passer un simple `Map` sans IndexedDB.
 */
export interface KeyringLike {
  list(): Promise<readonly KeyringEntry[]>;
  get(id: string): Promise<KeyringEntry | null>;
  put(entry: KeyringEntry): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * Vue allégée d'un wallet persisté (sans le blob chiffré).
 *
 * `network` reprend le type de wallet-core ("mainnet"|"testnet"|"devnet"),
 * pas le `Network` objet de wallet-chains.
 */
export interface StoredAccountSummary {
  readonly id: string;
  readonly label: string;
  readonly network: KeyringEntry["network"];
  readonly createdAt: number;
}

/**
 * Gestion des wallets persistés + du wallet actuellement actif.
 *
 * ⚠️ Divergence assumée vs design doc §3.6 : la version initiale
 *    parlait de `add(accountIndex)` (dérivation HD). En V0 sans HD,
 *    il n'y a qu'un index (0), et ce qu'on gère réellement c'est la
 *    **liste des wallets persistés** (Keyring). L'API reflète ça.
 */
export interface AccountList {
  /** Liste les wallets persistés (métadonnées seulement). */
  list(): Promise<readonly StoredAccountSummary[]>;

  /** Persiste un wallet déjà chiffré (blob produit par wallet-core). */
  persist(entry: KeyringEntry): Promise<void>;

  /** Supprime un wallet persisté. No-op si absent. */
  forget(id: string): Promise<void>;

  /**
   * Wallet actuellement déverrouillé en mémoire (celui que la session
   * utilise pour signer). `undefined` tant que `setCurrent` n'a pas
   * été appelé.
   */
  current(): AccountRef | undefined;

  /** Définit le wallet actif. */
  setCurrent(account: AccountRef): void;
}

/**
 * Implémentation backed by `Keyring` (IndexedDB en prod, Map en test).
 */
export class KeyringBackedAccountList implements AccountList {
  readonly #keyring: KeyringLike;
  #current: AccountRef | undefined;

  constructor(keyring: KeyringLike) {
    this.#keyring = keyring;
  }

  async list(): Promise<readonly StoredAccountSummary[]> {
    const entries = await this.#keyring.list();
    return entries
      .map((e) => ({
        id: e.id,
        label: e.label,
        network: e.network,
        createdAt: e.createdAt,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async persist(entry: KeyringEntry): Promise<void> {
    await this.#keyring.put(entry);
  }

  async forget(id: string): Promise<void> {
    await this.#keyring.remove(id);
  }

  current(): AccountRef | undefined {
    return this.#current;
  }

  setCurrent(account: AccountRef): void {
    this.#current = account;
  }
}

/**
 * Implémentation en mémoire de `AccountList`.
 *
 * Utilisée par `WalletSessionProvider` (V0.1) tant que la persistance
 * IndexedDB n'est pas nécessaire pour les hooks pilotes. Sera
 * remplacée par `KeyringBackedAccountList` en V0.2 (page "Mes
 * wallets" / multi-comptes).
 */
export class InMemoryAccountList implements AccountList {
  readonly #entries = new Map<string, StoredAccountSummary>();
  #current: AccountRef | undefined;

  async list(): Promise<readonly StoredAccountSummary[]> {
    return Array.from(this.#entries.values()).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }

  async persist(entry: KeyringEntry): Promise<void> {
    this.#entries.set(entry.id, {
      id: entry.id,
      label: entry.label,
      network: entry.network,
      createdAt: entry.createdAt,
    });
  }

  async forget(id: string): Promise<void> {
    this.#entries.delete(id);
  }

  current(): AccountRef | undefined {
    return this.#current;
  }

  setCurrent(account: AccountRef): void {
    this.#current = account;
  }
}
