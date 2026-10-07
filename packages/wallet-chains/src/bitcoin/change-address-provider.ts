import type { Bip39Wallet, BitcoinNetwork } from "@sango/wallet-core";

/**
 * Adresse change Bitcoin — E2.1.b.3 / E2.1.b.5.
 *
 * **D-E2.1-15 (ajustement)** : le payload de transaction porte
 * explicitement le `derivationIndex` de l'adresse change utilisée.
 * Cela évite tout parsing d'adresse côté broadcaster et rend le
 * `commit()` parfaitement déterministe.
 */
export interface BitcoinChangeAddress {
  readonly address: string;
  /** ScriptPubKey P2WPKH reconstruit depuis l'adresse. */
  readonly script: Uint8Array;
  /** Index HD non-hardened dans la branche change (0, 1, 2, …). */
  readonly derivationIndex: number;
}

/**
 * Fournisseur d'adresse change Bitcoin — E2.1.b.3 / E2.1.b.5.
 *
 * **D-E2.1-3** — Sémantique "commit après broadcast" :
 *   - `getChangeAddress()` est appelé au moment du build. Retourne
 *     l'adresse change **actuelle** (`m/84'/…/1/{derivationIndex}`)
 *     sans incrémenter le compteur.
 *   - `commit(derivationIndex)` est appelé **uniquement après un
 *     broadcast réussi** (par le broadcaster, b.5). Il valide que
 *     `derivationIndex` correspond bien à l'index courant, puis
 *     incrémente.
 *   - Si une tx est annulée avant broadcast, aucune adresse n'est
 *     "consommée" — pas de trou dans la séquence.
 *
 * **Concurrence** : pour le MVP, on sérialise les sends Bitcoin au
 * niveau de la session (une seule tx Bitcoin "en vol" à la fois).
 * Pas besoin de système de réservation complexe.
 */
export interface BitcoinChangeAddressProvider {
  /**
   * Retourne l'adresse change courante.
   *
   * N'incrémente pas le compteur — c'est `commit()` qui le fera
   * après broadcast réussi.
   */
  getChangeAddress(): Promise<BitcoinChangeAddress>;

  /**
   * Marque l'index comme consommé.
   *
   * **Validation stricte** : `derivationIndex` DOIT égaler l'index
   * courant. Sinon `Error` — signale un bug (double commit, index
   * périmé, désynchro).
   */
  commit(derivationIndex: number): void;

  /**
   * Index change courant (0 au démarrage, +1 après chaque commit).
   * Pour tests et debug uniquement.
   */
  currentIndex(): number;
}

/**
 * Implémentation MVP (en mémoire) — D-E2.1-3.
 *
 * **Décisions actées** :
 *   - `nextChangeIndex` en mémoire. Perdu au reload — accepté pour
 *     MVP (testnet uniquement). Persistance dans un patch ultérieur.
 *   - Dérivation : `m/84'/{coinType}'/0'/1/{derivationIndex}`.
 *     `accountIndex` fixé à 0 — `Bip39Wallet.getBitcoinIdentity()`
 *     ne prend pas encore d'`accountIndex`, cohérent avec le
 *     périmètre MVP (un seul compte HD).
 *   - `change=1` hardcodé via `getBitcoinIdentity`.
 *
 * **E2.1.b.5** — le paramètre `_networkId` est conservé pour la
 * symétrie avec les autres constructeurs (et futur usage si on
 * stocke un état par réseau). Il n'est pas utilisé pour l'instant.
 */
export class BitcoinChangeAddressProviderImpl
  implements BitcoinChangeAddressProvider
{
  readonly #wallet: Bip39Wallet;
  readonly #network: BitcoinNetwork;
  #nextChangeIndex = 0;

  constructor(
    wallet: Bip39Wallet,
    network: BitcoinNetwork,
    _networkId: string,
  ) {
    this.#wallet = wallet;
    this.#network = network;
  }

  async getChangeAddress(): Promise<BitcoinChangeAddress> {
    // Dérive `m/84'/…/1/{nextChangeIndex}` — change=1, index=compteur.
    const identity = this.#wallet.getBitcoinIdentity(
      this.#network,
      1,
      this.#nextChangeIndex,
    );
    return {
      address: identity.address,
      script: identity.scriptPubKey,
      derivationIndex: this.#nextChangeIndex,
    };
  }

  commit(derivationIndex: number): void {
    if (derivationIndex !== this.#nextChangeIndex) {
      throw new Error(
        `BitcoinChangeAddressProviderImpl.commit: derivationIndex ${derivationIndex} ≠ current ${this.#nextChangeIndex}. ` +
          "Probable double commit ou désynchro entre build et broadcast.",
      );
    }
    this.#nextChangeIndex += 1;
  }

  currentIndex(): number {
    return this.#nextChangeIndex;
  }
}
