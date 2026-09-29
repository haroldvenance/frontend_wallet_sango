import type { AccountRef } from "../types/account";
import type { Signer } from "../types/signer";
import type { UnsignedTransaction, SignedTransaction } from "../types/tx";

export type { Signer };

/**
 * Capacité optionnelle : signer une transaction.
 *
 * Le `Signer` reçu est celui de la couche session. Le provider ne
 * manipule jamais la mnemonic.
 *
 * `account` est nécessaire pour que le `Signer` sache quelle clé
 * utiliser (en V0, toujours `accountIndex = 0`).
 */
export interface TransactionSigner {
  sign(
    tx: UnsignedTransaction,
    signer: Signer,
    account: AccountRef,
  ): Promise<SignedTransaction>;
}
