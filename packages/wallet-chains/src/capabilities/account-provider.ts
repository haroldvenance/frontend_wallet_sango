import type { AccountState } from "../types/account";

/**
 * Capacité optionnelle : lecture de l'état complet d'un compte
 * (adresse + publicKey + balance + nonce) en un appel.
 *
 * Optionnelle parce que les chaînes en lecture seule ou sans notion
 * de nonce (BTC UTXO) peuvent l'omettre. La session lève une erreur
 * claire si `getAccount` est appelée sur un adapter sans cette
 * capacité.
 *
 * En V0 seul SANGO l'implémente.
 */
export interface AccountProvider {
  /**
   * Retourne l'état du compte, ou `null` si le compte n'existe pas
   * encore on-chain (compte "ghost" — solde 0, nonce 0, pas de
   * publicKey enregistrée).
   *
   * L'adresse est au format natif de la chaîne, tel que produit par
   * `AddressProvider.deriveAddress`.
   */
  getAccount(address: string): Promise<AccountState | null>;
}
