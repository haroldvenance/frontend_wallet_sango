import type { TransactionSigner } from "../capabilities/transaction-signer";
import type { AccountRef } from "../types/account";
import type { Hash } from "../types/address";
import type { Signer } from "../types/signer";
import type {
  SignedTransaction,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import {
  compactToEip1559Signature,
  computeEip1559TxHash,
  encodeEip1559Digest,
  encodeEip1559Signed,
  type Eip1559UnsignedFields,
} from "./eip1559-codec";

/**
 * Signature d'une tx EVM EIP-1559.
 *
 * Pipeline :
 *   1. Extraire les `Eip1559UnsignedFields` du payload opaque.
 *   2. digest = keccak256(0x02 || rlp(unsigned)).
 *   3. signer.signDigestRecoverable(digest) → { compact, recovery }.
 *   4. RLP signé + txHash canonique.
 *
 * Le `Signer` ne voit jamais la structure de la tx — uniquement un
 * digest de 32 bytes. C'est ce qui rend l'abstraction portable.
 */
export class EvmTransactionSigner implements TransactionSigner {
  async sign(
    tx: ChainsUnsignedTx,
    signer: Signer,
    account: AccountRef,
  ): Promise<SignedTransaction> {
    if (tx.family !== "evm") {
      throw new Error(
        `EvmTransactionSigner: unexpected family "${tx.family}"`,
      );
    }
    if (!signer.signDigestRecoverable) {
      throw new Error(
        "EvmTransactionSigner: signer does not expose signDigestRecoverable (required for EIP-1559 yParity)",
      );
    }

    const fields = tx.payload as Eip1559UnsignedFields;

    // 1. Digest à signer.
    const digest = encodeEip1559Digest(fields);

    // 2. Signature recoverable (compact 64 bytes + recovery 0 | 1).
    const { compact, recovery } = await signer.signDigestRecoverable(
      hexToBytes(digest),
      account,
    );

    // 3. Conversion au format viem { r, s, yParity }.
    const sig = compactToEip1559Signature(compact, recovery);

    // 4. RLP signé + hash canonique.
    const raw = encodeEip1559Signed(fields, sig);
    const txHash = computeEip1559TxHash(fields, sig);

    return {
      unsigned: tx,
      raw: hexToBytes(raw),
      txHash,
    };
  }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// Silence unused-import warning potentiel (Hash est utilisé
// implicitement via computeEip1559TxHash).
void 0 as unknown as Hash;
