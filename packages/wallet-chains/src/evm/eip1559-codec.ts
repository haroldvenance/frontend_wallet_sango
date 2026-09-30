import {
  keccak256,
  serializeTransaction,
  type TransactionSerializableEIP1559,
} from "viem";

import type { Address, Hash } from "../types/address";

/**
 * Champs d'une transaction EIP-1559 non signée.
 *
 * **D-EVM-1** — le codec RLP est **pur, offline, déterministe**. Il ne
 * touche ni au réseau, ni à `EvmRpc`, ni à `RpcPool`. viem est utilisé
 * uniquement ici pour l'encodage RLP byte-à-byte (audité).
 *
 * Tous les champs numériques sont en `bigint` ou `number` JS natif —
 * la conversion hex vient de viem.
 */
export interface Eip1559UnsignedFields {
  readonly chainId: number;
  readonly nonce: number;
  /** Absent pour un déploiement de contrat. */
  readonly to?: Address;
  readonly value: bigint;
  /** `0x…` — absent → data vide. */
  readonly data?: Hash;
  readonly gasLimit: bigint;
  /** Cap maximum par gas (baseFee + priorityTip). */
  readonly maxFeePerGas: bigint;
  /** Tip pour le validateur. */
  readonly maxPriorityFeePerGas: bigint;
}

/**
 * Signature EIP-1559 — `r || s` en hex 32 bytes + `yParity` ∈ {0, 1}.
 *
 * C'est la forme exacte que `viem.serializeTransaction(tx, sig)`
 * accepte. Le `v` legacy (27 + recovery) n'existe pas en 1559.
 */
export interface Eip1559RecoveredSignature {
  readonly r: Hash;
  readonly s: Hash;
  readonly yParity: 0 | 1;
}

/**
 * Convertit `compact` (64 bytes : r(32) || s(32)) + recovery en
 * signature EIP-1559 hex.
 *
 * Utilisé par le `TransactionSigner` EVM après
 * `signer.signDigestRecoverable()`.
 */
export function compactToEip1559Signature(
  compact: Uint8Array,
  recovery: 0 | 1,
): Eip1559RecoveredSignature {
  if (compact.length !== 64) {
    throw new Error(
      `compactToEip1559Signature: compact must be 64 bytes, got ${compact.length}`,
    );
  }
  return {
    r: bytesToHex32(compact.slice(0, 32)),
    s: bytesToHex32(compact.slice(32)),
    yParity: recovery,
  };
}

/**
 * Calcule le digest à signer :
 *   keccak256(0x02 || rlp([...unsigned fields]))
 *
 * C'est ce digest qui est passé à `Signer.signDigestRecoverable`.
 */
export function encodeEip1559Digest(fields: Eip1559UnsignedFields): Hash {
  return keccak256(serializeTransaction(toViemTx(fields)));
}

/**
 * RLP-encode la tx signée :
 *   0x02 || rlp([...unsigned, yParity, r, s])
 *
 * Retourne le raw `0x…` à broadcaster.
 */
export function encodeEip1559Signed(
  fields: Eip1559UnsignedFields,
  sig: Eip1559RecoveredSignature,
): Hash {
  return serializeTransaction(toViemTx(fields), {
    r: sig.r,
    s: sig.s,
    yParity: sig.yParity,
  });
}

/**
 * Hash canonique d'une tx signée (EVM `txHash`) :
 *   keccak256(encodeEip1559Signed(fields, sig))
 */
export function computeEip1559TxHash(
  fields: Eip1559UnsignedFields,
  sig: Eip1559RecoveredSignature,
): Hash {
  return keccak256(encodeEip1559Signed(fields, sig));
}

// ── Internes ────────────────────────────────────────────────

function toViemTx(fields: Eip1559UnsignedFields): TransactionSerializableEIP1559 {
  const base = {
    chainId: fields.chainId,
    nonce: fields.nonce,
    value: fields.value,
    gas: fields.gasLimit,
    maxFeePerGas: fields.maxFeePerGas,
    maxPriorityFeePerGas: fields.maxPriorityFeePerGas,
  };
  const to = fields.to ? { to: fields.to } : {};
  const data = fields.data ? { data: fields.data } : {};

  return {
    type: "eip1559",
    ...base,
    ...to,
    ...data,
  } as TransactionSerializableEIP1559;
}

function bytesToHex32(bytes: Uint8Array): Hash {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s as Hash;
}
