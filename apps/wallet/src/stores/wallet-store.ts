import type { Network } from "@sango/types";
import type { Bip39Wallet, Wallet, WalletFormat } from "@sango/wallet-core";
import { create } from "zustand";

/**
 * Union des wallets supportés (legacy SANGO + BIP-39 EVM).
 *
 * Dupliqué de `@sango/wallet-session` pour éviter une dépendance
 * circulaire (session → store, store → session).
 */
export type AnyWallet = Wallet | Bip39Wallet;

/**
 * État de session du wallet.
 *
 * ⚠️ Ne contient JAMAIS de seed en clair : uniquement l'instance
 *    `Wallet`/`Bip39Wallet` (dont le secret est privé au runtime JS).
 *
 * **Patch 5 (D-NET-2)** — deux champs de réseau distincts :
 *   - `networkId` : identifiant canonique wallet-chains
 *                   (`"sango-devnet"`, `"ethereum-sepolia"`, …).
 *   - `network`   : label SANGO `"mainnet" | "testnet"` (HRP bech32m,
 *                   pilote les query keys existantes). Dérivé de
 *                   `networkId` pour SANGO ; `"testnet"` par défaut
 *                   pour BIP-39 (aucun sens fonctionnel, les hooks
 *                   EVM lisent `networkId`).
 */
export type WalletStatus = "no-wallet" | "locked" | "unlocked";

export interface UnlockArgs {
  readonly wallet: AnyWallet;
  readonly id: string;
  readonly format: WalletFormat;
  readonly networkId: string;
  /** Optionnel — défaut "testnet". Utile uniquement pour SANGO. */
  readonly network?: Network;
}

interface WalletState {
  /** Instance wallet active (null si verrouillé ou aucune). */
  wallet: AnyWallet | null;
  /** Format de construction ("sango-legacy" | "bip39"). */
  format: WalletFormat | null;
  /** Identifiant canonique wallet-chains. */
  networkId: string;
  /** Label SANGO (HRP bech32m) — pilote les query keys SANGO. */
  network: Network;
  /** Statut de session. */
  status: WalletStatus;
  /** ID de l'entrée dans le keyring (adresse hex lowercase). */
  activeId: string | null;

  // Actions
  unlock: (args: UnlockArgs) => void;
  lock: () => void;
  noWallet: () => void;
  setNetwork: (network: Network) => void;
  /**
   * Change le `networkId` EVM actif (session-only, non persisté).
   *
   * Réservé aux wallets BIP-39 (EVM). Sans effet sur les wallets
   * SANGO legacy. Reset à la valeur du keyring au prochain unlock.
   *
   * Limitation E1.5 : le changement n'est pas persisté. À revoir en
   * E2 avec l'UI multi-chaîne.
   */
  setNetworkId: (networkId: string) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  format: null,
  networkId: "sango-devnet",
  network: "testnet",
  status: "no-wallet",
  activeId: null,

  unlock: ({ wallet, id, format, networkId, network }) =>
    set({
      wallet,
      format,
      networkId,
      network: network ?? "testnet",
      status: "unlocked",
      activeId: id,
    }),

  lock: () => {
    const { wallet } = get();
    if (wallet) wallet.destroy();
    set({ wallet: null, format: null, status: "locked" });
  },

  noWallet: () =>
    set({
      wallet: null,
      format: null,
      status: "no-wallet",
      activeId: null,
    }),

  setNetwork: (network) => set({ network }),

  setNetworkId: (networkId) => {
    // Sécurité : refuse si le wallet actif n'est pas EVM.
    const { format } = get();
    if (format !== "bip39") {
      console.warn(
        `wallet-store.setNetworkId: ignored (format="${format}", expected "bip39")`,
      );
      return;
    }
    set({ networkId });
  },
}));
