import type { AccountRef } from "../types/account";
import type { UnsignedTransaction, SignedTransaction } from "../types/tx";

/**
 * Interface minimale d'un signer, fournie par `wallet-core`.
 *
 * Déclarée ici en type structurel pour éviter une dépendance
 * circulaire (wallet-chains → wallet-core → …).
 */
export interface Signer {
  getPublicKey(account: AccountRef): Promise<Uint8Array>;
  signBytes(message: Uint8Array, account: AccountRef): Promise<Uint8Array>;
}

/**
 * Capacité optionnelle : signer une transaction.
 *
 * Le `Signer` reçu est celui de `wallet-core`. Le provider ne
 * manipule jamais la mnemonic.
 */
export interface TransactionSigner {
  sign(tx: UnsignedTransaction, signer: Signer): Promise<SignedTransaction>;
}
