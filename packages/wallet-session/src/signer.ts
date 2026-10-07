import { Bip39Wallet, Wallet } from "@sango/wallet-core";
import type { BitcoinNetwork } from "@sango/wallet-core";

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
      assertFamily(account, ["sango"], "signerFromWallet");
      return wallet.identity.publicKey;
    },
    async signDomain(
      domain: Uint8Array,
      payload: Uint8Array,
      account: AccountRef,
    ): Promise<Uint8Array> {
      assertFamily(account, ["sango"], "signerFromWallet");
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
    /**
     * **E2.1.b.4** — dispatch multi-famille :
     *   - `family === "evm"` → clé publique **non-compressed** 65 bytes
     *     (requis par `deriveEthereumAddress`).
     *   - `family === "bitcoin"` → clé publique **compressed** 33 bytes
     *     (requis par P2WPKH, vérifiable contre le `witnessUtxo`).
     *
     * **D-E2.1-16** : c'est le premier endroit où une méthode du
     * `Signer` retourne un format **différent** selon la famille.
     * Chaque consommateur sait ce qu'il attend de sa famille.
     */
    async getPublicKey(account: AccountRef): Promise<Uint8Array> {
      assertFamily(account, ["evm", "bitcoin"], "signerFromBip39Wallet");
      if (account.family === "evm") {
        return wallet.getIdentity(account.accountIndex).publicKeyUncompressed;
      }
      // bitcoin
      const network = btcNetworkFromNetworkId(account.networkId);
      const identity = wallet.getBitcoinIdentity(network, 0, account.accountIndex);
      return identity.publicKeyCompressed;
    },

    async signDomain(
      domain: Uint8Array,
      payload: Uint8Array,
      account: AccountRef,
    ): Promise<Uint8Array> {
      assertFamily(account, ["evm"], "signerFromBip39Wallet.signDomain");
      return wallet.signDomain(domain, payload, account.accountIndex);
    },

    async signDigestRecoverable(
      digest: Uint8Array,
      account: AccountRef,
    ): Promise<{ compact: Uint8Array; recovery: 0 | 1 }> {
      assertFamily(account, ["evm"], "signerFromBip39Wallet.signDigestRecoverable");
      return wallet.signDigestRecoverable(digest, account.accountIndex);
    },

    /**
     * **E2.1.b.4 (D-E2.1-10)** — signature ECDSA DER. Supporte EVM
     * (usage générique) et Bitcoin (BIP-143 / P2WPKH).
     */
    async signEcdsaDer(
      digest: Uint8Array,
      account: AccountRef,
    ): Promise<Uint8Array> {
      assertFamily(account, ["evm", "bitcoin"], "signerFromBip39Wallet.signEcdsaDer");
      if (account.family === "evm") {
        return wallet.signEcdsaDer(digest, {
          family: "evm",
          index: account.accountIndex,
        });
      }
      const network = btcNetworkFromNetworkId(account.networkId);
      return wallet.signEcdsaDer(digest, {
        family: "bitcoin",
        network,
        index: account.accountIndex,
      });
    },
  };
}

/**
 * Résout le réseau Bitcoin depuis un `networkId` wallet-chains.
 *
 * **Limitation MVP** : mainnet non enregistré (D-E2.1-2). Toute
 * valeur non "bitcoin-testnet" renvoie "testnet" pour rester
 * tolérant, mais un futur patch mainnet devra être plus strict.
 */
function btcNetworkFromNetworkId(networkId: string): BitcoinNetwork {
  return networkId === "bitcoin-mainnet" ? "mainnet" : "testnet";
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
  expected: readonly ("sango" | "evm" | "bitcoin")[],
  ctx: string,
): void {
  if (!expected.includes(account.family as "sango" | "evm" | "bitcoin")) {
    throw new Error(
      `${ctx}: account.family is "${account.family}" but this signer only handles ${expected.map((f) => `"${f}"`).join(" | ")}`,
    );
  }
}
