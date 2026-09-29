import type { AccountRef } from "./account";

/**
 * Interface minimale d'un signer, fournie par la couche session.
 *
 * Le `Signer` ne connaît **pas** le format des transactions d'une
 * chaîne : il expose uniquement deux primitives cryptographiques.
 * C'est le `TransactionSigner` de chaque famille qui compose.
 *
 * Implémentation de référence en session : un adapter au-dessus de
 * `Wallet` (wallet-core) qui route `signDomain(domain, payload)` vers
 * `Wallet.signDomain(domain, payload)`.
 */
export interface Signer {
  /**
   * Clé publique Ed25519 (32 bytes) associée à `account`.
   */
  getPublicKey(account: AccountRef): Promise<Uint8Array>;

  /**
   * Signe `domain || payload` avec la clé Ed25519 de `account`.
   *
   * Miroir exact de `Wallet.signDomain(domain, payload)` de wallet-core.
   */
  signDomain(
    domain: Uint8Array,
    payload: Uint8Array,
    account: AccountRef,
  ): Promise<Uint8Array>;
}
