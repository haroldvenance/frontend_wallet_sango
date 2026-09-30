import type { AccountRef } from "./account";

/**
 * Signature secp256k1 recoverable (EVM EIP-1559).
 *
 * Le recovery bit ∈ {0, 1} est utilisé comme `yParity` dans la tx.
 */
export interface RecoverableDigestSignature {
  readonly compact: Uint8Array; // 64 bytes : r(32) || s(32)
  readonly recovery: 0 | 1;
}

/**
 * Interface minimale d'un signer, fournie par la couche session.
 *
 * Le `Signer` ne connaît **pas** le format des transactions d'une
 * chaîne : il expose uniquement deux primitives cryptographiques
 * (Ed25519 pour SANGO, secp256k1 pour EVM).
 *
 * **D-SIGNER-1** — Dispatch par `account.family`, pas par classe
 * concrète. L'implémentation MultiCurveSigner (patch 5) route :
 *   - family === "sango" → Ed25519
 *   - family === "evm"   → secp256k1
 */
export interface Signer {
  /**
   * Clé publique associée à `account`.
   *
   * Pour SANGO : Ed25519 (32 bytes).
   * Pour EVM   : secp256k1 **non-compressée** (65 bytes, préfixe 0x04).
   */
  getPublicKey(account: AccountRef): Promise<Uint8Array>;

  /**
   * Signe `domain || payload` (Ed25519 côté SANGO, secp256k1 +
   * keccak256 pour EVM).
   */
  signDomain(
    domain: Uint8Array,
    payload: Uint8Array,
    account: AccountRef,
  ): Promise<Uint8Array>;

  /**
   * Signe un digest 32 bytes et retourne le recovery bit.
   *
   * **Optionnel** — requis uniquement pour EVM (EIP-1559 yParity).
   * Un Signer Ed25519 pur (legacy SANGO) peut l'omettre.
   */
  signDigestRecoverable?(
    digest: Uint8Array,
    account: AccountRef,
  ): Promise<RecoverableDigestSignature>;
}
