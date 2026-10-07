import { sha256 } from "@noble/hashes/sha2.js";

import type { TransactionSigner } from "../capabilities/transaction-signer";
import type { AccountRef } from "../types/account";
import type { Signer } from "../types/signer";
import type {
  SignedTransaction,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import type { BitcoinUnsignedPayload } from "./transaction-builder";

/**
 * Signature d'une transaction Bitcoin P2WPKH (E2.1.b.4).
 *
 * **D-E2.1-9** — Pipeline de signature Bitcoin :
 *
 * ```
 *   pour chaque input i :
 *     preimage = psbt.preimageWitnessV0(i, scriptPubKey, SIGHASH_ALL, amount)
 *     digest   = sha256x2(preimage)                  ← double-SHA256
 *     der      = signer.signEcdsaDer(digest, account) ← DER ASN.1 low-S
 *     sig      = der || [SIGHASH_ALL]                 ← BIP-143 : hash byte en suffixe
 *     psbt.updateInput(i, { partialSig: [[pubkey, sig]] })
 *     psbt.finalizeIdx(i)
 *   raw    = psbt.extract()
 *   txHash = "0x" + psbt.id
 * ```
 *
 * **Pourquoi pas `psbt.signIdx(privKey, i)`** : cette méthode attend
 * une clé privée brute (ou un HDKey). Notre `Signer` cache la clé
 * par design. On passe par `preimageWitnessV0` + `signEcdsaDer`
 * (D-E2.1-10), ce qui préserve l'abstraction.
 *
 * **SIGHASH** : on utilise `SIGHASH_ALL` (0x01) hardcodé. C'est le
 * seul type pertinent pour un wallet personnel. Les autres types
 * (ANYONECANPAY, SINGLE, NONE) sont utiles pour les protocoles
 * avancés (Lightning, coinjoin) — hors scope.
 *
 * **Change input** : dans ce MVP, on signe uniquement les inputs
 * dont le `witnessUtxo.script` correspond à l'adresse de réception
 * (`m/84'/1'/0'/0/{accountIndex}`). Les inputs de change ne sont
 * pas encore gérés (change index tracking complet = patch ultérieur).
 *
 * ⚠️ **Mutabilité** : `sign()` **mute** le PSBT (`updateInput` +
 *    `finalizeIdx`). Le `tx.payload.tx` n'est PAS réutilisable après
 *    un appel — une 2e signature échoue avec
 *    `Cannot add signed field=partialSig/...`. Si besoin de signer
 *    deux fois (tests, reprise sur échec réseau), cloner d'abord via
 *    `psbt.clone()` (API @scure/btc-signer).
 */
export class BitcoinTransactionSigner implements TransactionSigner {
  async sign(
    tx: ChainsUnsignedTx,
    signer: Signer,
    account: AccountRef,
  ): Promise<SignedTransaction> {
    if (tx.family !== "bitcoin") {
      throw new Error(
        `BitcoinTransactionSigner: unexpected family "${tx.family}"`,
      );
    }
    if (!signer.signEcdsaDer) {
      throw new Error(
        "BitcoinTransactionSigner: signer does not expose signEcdsaDer (required for Bitcoin BIP-143)",
      );
    }

    const payload = tx.payload as BitcoinUnsignedPayload;
    const psbt = payload.tx;

    // Récupère la clé publique compressed (33 bytes) pour le
    // `partialSig`. Requis par P2WPKH.
    const pubkey = await signer.getPublicKey(account);
    if (pubkey.length !== 33) {
      throw new Error(
        `BitcoinTransactionSigner: expected 33-byte compressed pubkey, got ${pubkey.length}. ` +
          `account.family = "${account.family}" — Bitcoin signer needs family="bitcoin".`,
      );
    }

    const SIGHASH_ALL = 1;
    const inputCount = psbt.inputsLength;

    for (let i = 0; i < inputCount; i += 1) {
      const input = psbt.getInput(i);
      const witnessUtxo = input.witnessUtxo;
      if (!witnessUtxo) {
        throw new Error(
          `BitcoinTransactionSigner: input ${i} is missing witnessUtxo`,
        );
      }
      const { amount, script } = witnessUtxo;

      // 1. Preimage BIP-143 pour P2WPKH.
      const preimage = psbt.preimageWitnessV0(
        i,
        script,
        SIGHASH_ALL,
        amount,
      );

      // 2. Double SHA256 → digest 32 bytes.
      const digest = sha256(sha256(preimage));

      // 3. Signature DER via le Signer (D-E2.1-10).
      const der = await signer.signEcdsaDer(digest, account);

      // 4. Concaténation `der || sighashByte` (BIP-143).
      const sigWithSighash = new Uint8Array(der.length + 1);
      sigWithSighash.set(der, 0);
      sigWithSighash[der.length] = SIGHASH_ALL;

      // 5. Injection du partialSig + finalisation.
      psbt.updateInput(i, {
        partialSig: [[pubkey, sigWithSighash]],
      });
      psbt.finalizeIdx(i);
    }

    // 6. Sérialisation finale + hash canonique.
    const raw = psbt.extract();
    const txHash = `0x${psbt.id}` as const;

    return {
      unsigned: tx,
      raw,
      txHash,
    };
  }
}
