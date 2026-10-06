import type { BitcoinNetwork } from "@sango/wallet-core";

/**
 * Fournisseur d'adresse change — E2.1.b.3 (D-E2.1-15).
 *
 * **D-E2.1-3** — Sémantique "commit après broadcast" :
 *   - `next()` est appelé au moment du build. Il retourne l'adresse
 *     change **actuelle** sans incrémenter le compteur.
 *   - `commit()` est appelé **uniquement après un broadcast réussi**
 *     (par le broadcaster, b.5). Il incrémente le compteur.
 *   - Si une tx est annulée avant broadcast, aucune adresse n'est
 *     "consommée" — pas de trou dans la séquence.
 *
 * En mémoire pour le MVP. La persistance (keyring, store) viendra
 * dans un patch ultérieur — l'API n'aura pas besoin de changer.
 *
 * **Concurrence** : pour le MVP, on sérialise les sends Bitcoin au
 * niveau de la session (une seule tx Bitcoin "en vol" à la fois).
 * Pas besoin de système de réservation complexe.
 */
export interface BitcoinChangeAddress {
  readonly address: string;
  /** ScriptPubKey P2WPKH reconstruit depuis l'adresse. */
  readonly script: Uint8Array;
}

export interface BitcoinChangeAddressProvider {
  /**
   * Retourne l'adresse change courante. N'incrémente pas le compteur.
   *
   * @throws si le réseau ne correspond pas à celui du wallet.
   */
  next(network: BitcoinNetwork): Promise<BitcoinChangeAddress>;

  /**
   * Marque l'adresse comme consommée. À appeler **après broadcast
   * réussi** uniquement.
   */
  commit(): void;

  /**
   * Index change courant (pour tests / debug). Ne pas utiliser pour
   * décider quoi que ce soit au runtime.
   */
  currentIndex(): number;
}
