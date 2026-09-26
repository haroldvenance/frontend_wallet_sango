import type { Network } from "@sango/types";
import type { Wallet } from "@sango/wallet-core";
import { create } from "zustand";

/**
 * État de session du wallet.
 *
 * ⚠️ Ne contient JAMAIS de seed en clair : uniquement l'instance `Wallet`
 *    (dont le `#secretKey` est privé au runtime JS).
 */
export type WalletStatus = "no-wallet" | "locked" | "unlocked";

interface WalletState {
  /** Instance wallet active (null si verrouillé ou aucune). */
  wallet: Wallet | null;
  /** Statut de session. */
  status: WalletStatus;
  /** ID de l'entrée dans le keyring (adresse hex lowercase). */
  activeId: string | null;
  /** Réseau attendu pour cette session. */
  network: Network;

  // Actions
  unlock: (wallet: Wallet, id: string, network: Network) => void;
  lock: () => void;
  noWallet: () => void;
  setNetwork: (network: Network) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  status: "no-wallet",
  activeId: null,
  network: "testnet",

  unlock: (wallet, id, network) =>
    set({ wallet, status: "unlocked", activeId: id, network }),

  lock: () => {
    const { wallet } = get();
    if (wallet) wallet.destroy();
    set({ wallet: null, status: "locked" });
  },

  noWallet: () =>
    set({ wallet: null, status: "no-wallet", activeId: null }),

  setNetwork: (network) => set({ network }),
}));
