import type { Network } from "@sango/types";
import type { Bip39Wallet, Wallet, WalletFormat } from "@sango/wallet-core";
import { evmNetworkById } from "@sango/wallet-chains";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
 *
 * **E2.3.a.1 (D-E2.3-1)** — `networkId` est désormais **persisté**
 * dans localStorage (`sango.wallet-session.v1`) pour survivre au
 * reload. Voir `resolveUnlockedNetworkId` pour la logique de fusion
 * entre préférence de session et `networkId` du keyring.
 */
export type WalletStatus = "no-wallet" | "locked" | "unlocked";

export interface UnlockArgs {
  readonly wallet: AnyWallet;
  readonly id: string;
  readonly format: WalletFormat;
  /**
   * `networkId` **structurel** du wallet (issu du keyring au
   * déverrouillage, ou du formulaire de création).
   *
   * Ne pas confondre avec la préférence de session persistée :
   * `unlock()` arbitre entre les deux via `resolveUnlockedNetworkId`.
   */
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
   * Change le `networkId` EVM actif (persisté depuis E2.3.a.1).
   *
   * Réservé aux wallets BIP-39 (EVM). Sans effet sur les wallets
   * SANGO legacy — leur réseau est figé par le keyring.
   */
  setNetworkId: (networkId: string) => void;
}

const PERSIST_KEY = "sango.wallet-session.v1";
const isClient = typeof window !== "undefined";

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallet: null,
      format: null,
      networkId: "sango-devnet",
      network: "testnet",
      status: "no-wallet",
      activeId: null,

      unlock: ({ wallet, id, format, networkId: keyringNetworkId, network }) => {
        const networkId = resolveUnlockedNetworkId(
          format,
          keyringNetworkId,
          get().networkId,
        );
        set({
          wallet,
          format,
          networkId,
          network: network ?? "testnet",
          status: "unlocked",
          activeId: id,
        });
      },

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
    }),
    {
      name: PERSIST_KEY,
      storage: isClient
        ? createJSONStorage(() => localStorage)
        : undefined,
      /**
       * **D-E2.3-1** — seule la préférence de session (`networkId`)
       * est persistée. Ni le wallet (non sérialisable), ni le format,
       * ni le statut, ni l'activeId ne survivent au reload.
       */
      partialize: (state) => ({ networkId: state.networkId }),
      /**
       * Au rehydrate, on valide le `networkId` persisté contre le
       * registre EVM. Un `networkId` inconnu (registre modifié,
       * localStorage corrompu) est ignoré — on retombe sur la
       * valeur initiale du store. Le vrai arbitrage (préférence
       * vs keyring) se fait ensuite dans `unlock()`.
       */
      merge: (persisted, current) => {
        const p = persisted as { networkId?: unknown } | undefined;
        const candidate =
          typeof p?.networkId === "string" ? p.networkId : null;
        const valid =
          candidate && evmNetworkById(candidate)
            ? candidate
            : current.networkId;
        return { ...current, networkId: valid };
      },
    },
  ),
);

/**
 * Arbitre entre la préférence de session (persistée) et le
 * `networkId` structurel du keyring au moment de l'unlock.
 *
 * **D-E2.3-1** :
 *
 * ```
 *   create/import  →  keyring networkId
 *                          ↓
 *                    préférence session valide ?
 *                    ├─ oui (EVM connu)  →  préférence
 *                    └─ non              →  keyring
 * ```
 *
 * - Les wallets **SANGO** ne consultent JAMAIS la préférence : leur
 *   réseau (`sango-devnet`) est figé au create/import.
 * - `ethereum-sepolia` **n'est pas** un fallback. C'est uniquement
 *   le défaut de **création** (choix produit E2.3.a.2). Un couple
 *   (préférence invalide, keyring invalide) signale un état
 *   incohérent : on log une erreur explicite plutôt que de masquer
 *   le problème avec un réseau arbitraire.
 */
function resolveUnlockedNetworkId(
  format: WalletFormat,
  keyringNetworkId: string,
  sessionPreference: string,
): string {
  if (format !== "bip39") {
    // SANGO : keyring wins, unconditionally.
    return keyringNetworkId;
  }

  // BIP-39 : la préférence de session gagne si elle pointe vers un
  // réseau EVM connu du registre.
  if (sessionPreference && evmNetworkById(sessionPreference)) {
    return sessionPreference;
  }

  // Pas de préférence valide → keyring. Vérifier que le keyring
  // lui-même n'est pas dans un état invalide (registre modifié,
  // config drift). On ne masque pas avec un fallback arbitraire.
  if (!evmNetworkById(keyringNetworkId)) {
    console.error(
      `[wallet-store] keyring networkId "${keyringNetworkId}" is not a known EVM network. ` +
        `Unlocking with the invalid value — downstream reads will fail explicitly.`,
    );
  }
  return keyringNetworkId;
}
