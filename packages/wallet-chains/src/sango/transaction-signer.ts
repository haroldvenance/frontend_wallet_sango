import {
  DOMAINS,
  encodeTransaction,
  encodeUnsignedTransaction,
  transactionHash,
  type Transaction as WalletCoreSignedTx,
  type UnsignedTransaction as WalletCoreUnsignedTx,
} from "@sango/wallet-core";

import type { TransactionSigner } from "../capabilities/transaction-signer";
import type { AccountRef } from "../types/account";
import type { Signer } from "../types/signer";
import type {
  SignedTransaction,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import { bytesToHex } from "./hex";

/**
 * Signature d'une tx SANGO native.
 *
 * Pipeline :
 *   1. extrait la `UnsignedTransaction` concrète du payload opaque ;
 *   2. l'encode canoniquement (147+ bytes LE) ;
 *   3. demande au `Signer` de signer `DOMAINS.TX_V1 || unsignedBytes` ;
 *   4. assemble la `Transaction` complète (unsigned ‖ signature) ;
 *   5. calcule `tx_hash = Keccak256(TX_V1 || unsignedBytes)`.
 *
 * Le `Signer` ne voit jamais la structure de la tx : il reçoit des
 * bytes et un domain. C'est ce qui rend l'abstraction portable
 * (EVM/BTC/SOL futurs).
 */
export class SangoTransactionSigner implements TransactionSigner {
  async sign(
    tx: ChainsUnsignedTx,
    signer: Signer,
    account: AccountRef,
  ): Promise<SignedTransaction> {
    if (tx.family !== "sango") {
      throw new Error(
        `SangoTransactionSigner: unexpected family "${tx.family}"`,
      );
    }

    const concrete = tx.payload as WalletCoreUnsignedTx;
    const unsignedBytes = encodeUnsignedTransaction(concrete);
    const signature = await signer.signDomain(
      DOMAINS.TX_V1,
      unsignedBytes,
      account,
    );

    const signed: WalletCoreSignedTx = { ...concrete, signature };
    const raw = encodeTransaction(signed);
    const hashBytes = transactionHash(signed);

    return {
      unsigned: tx,
      raw,
      txHash: bytesToHex(hashBytes),
    };
  }
}
