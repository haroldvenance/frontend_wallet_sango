import { Bip39Wallet, Wallet } from "@sango/wallet-core";

import type { AccountRef, Signer } from "@sango/wallet-chains";

/**
 * Union des wallets supportés par la session.
 *
 * **D-HD-1** — deux formats coexistent. Aucune migration.
 *   - `Wallet`      : legacy SANGO Ed25519 (32 bytes seed).
 *   - `Bip39Wallet` : BIP-39 secp256k1 (64 bytes seed), EVM-first.
 */
export type AnyWallet = Wallet | Bip39Wallet;

/**
 * Adapte un `Wallet` (wallet-core, legacy SANGO) en `Signer`.
 *
 * **Contrat** : ne répond que pour `account.family === "sango"`. Un
 * appel avec une autre famille lève une erreur claire — on ne veut
 * pas qu'une signature Ed25519 soit utilisée pour une chaîne EVM.
 *
 * L'`account.accountIndex` est ignoré en V0 (un seul compte HD).
 */
export function signerFromWallet(wallet: Wallet): Signer {
  return {
    async getPublicKey(account: AccountRef): Promise<Uint8Array> {
      assertFamily(account, "sango", "signerFromWallet");
      return wallet.identity.publicKey;
    },
    async signDomain(
      domain: Uint8Array,
      payload: Uint8Array,
      account: AccountRef,
    ): Promise<Uint8Array> {
      assertFamily(account, "sango", "signerFromWallet");
      return wallet.signDomain(domain, payload);
    },
    // Pas de signDigestRecoverable — Ed25519 n'a pas de recovery bit.
  };
}

/**
 * Adapte un `Bip39Wallet` (wallet-core, EVM) en `Signer`.
 *
 * **Contrat** : ne répond que pour `account.family === "evm"`. E1
 * n'implémente pas la dérivation SANGO via BIP-44 (coin type 100001),
 * donc un compte `family: "sango"` est rejeté.
 *
 * `account.accountIndex` = index HD BIP-44 (0 par défaut).
 */
export function signerFromBip39Wallet(wallet: Bip39Wallet): Signer {
  return {
    async getPublicKey(account: AccountRef): Promise<Uint8Array> {
      assertFamily(account, "evm", "signerFromBip39Wallet");
      return wallet.getIdentity(account.accountIndex).publicKeyUncompressed;
    },
    async signDomain(
      domain: Uint8Array,
      payload: Uint8Array,
      account: AccountRef,
    ): Promise<Uint8Array> {
      assertFamily(account, "evm", "signerFromBip39Wallet");
      return wallet.signDomain(domain, payload, account.accountIndex);
    },
    async signDigestRecoverable(
      digest: Uint8Array,
      account: AccountRef,
    ): Promise<{ compact: Uint8Array; recovery: 0 | 1 }> {
      assertFamily(account, "evm", "signerFromBip39Wallet");
      return wallet.signDigestRecoverable(digest, account.accountIndex);
    },
  };
}

/**
 * Dispatch selon le type concret du wallet.
 *
 * **D-SIGNER-1** — le dispatch *architectural* se fait par
 * `account.family` (au niveau de chaque signer ci-dessus). Cette
 * fonction choisit l'adapter selon le **type de wallet** déverrouillé.
 *
 * Chaque signer applique ensuite son `assertFamily()` — un wallet
 * SANGO ne peut pas signer pour un AccountRef EVM, et inversement.
 */
export function signerFromAnyWallet(wallet: AnyWallet): Signer {
  if (wallet instanceof Wallet) {
    return signerFromWallet(wallet);
  }
  if (wallet instanceof Bip39Wallet) {
    return signerFromBip39Wallet(wallet);
  }
  throw new Error(
    "signerFromAnyWallet: unsupported wallet type (expected Wallet | Bip39Wallet)",
  );
}

function assertFamily(
  account: AccountRef,
  expected: "sango" | "evm",
  ctx: string,
): void {
  if (account.family !== expected) {
    throw new Error(
      `${ctx}: account.family is "${account.family}" but this signer only handles "${expected}"`,
    );
  }
}
