import type { Network } from "@sango/types";
import type { Bip39Wallet, Wallet, WalletFormat } from "@sango/wallet-core";
import type { ChainFamily } from "@sango/wallet-chains";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { isKnownNetworkId, resolveChainFamily } from "@/lib/chain-family";

/**
 * Union des wallets supportés (legacy SANGO + BIP-39 EVM/Bitcoin).
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
 * **E2.1.b.6.1 (D-E2.1-18)** — `family` est dérivée de `networkId`
 * par `resolveChainFamily()`. Elle n'est **jamais** fournie par
 * l'UI ni persistée. Toute mutation de `networkId` recalcule
 * `family` dans le même `set()` pour éviter la divergence.
 *
 * Deux champs de réseau :
 *   - `networkId` : identifiant canonique wallet-chains
 *                   (`"sango-devnet"`, `"ethereum-sepolia"`,
 *                   `"bitcoin-testnet"`, …). **Persisté**.
 *   - `network`   : label SANGO `"mainnet" | "testnet"` (HRP
 *                   bech32m, pilote les query keys existantes).
 *                   Dérivé pour SANGO ; `"testnet"` par défaut pour
 *                   BIP-39 (aucun sens fonctionnel, les hooks
 *                   EVM/Bitcoin lisent `networkId`).
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
   * ⚠️ La `family` N'EST PAS dans cet objet — elle est dérivée du
   *    `networkId` par le store (D-E2.1-18).
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
  /**
   * Famille de chaîne, **dérivée** de `networkId` (D-E2.1-18).
   * Non persistée — recalculée à chaque mutation de `networkId`.
   */
  family: ChainFamily;
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
   * Change le `networkId` EVM/Bitcoin actif (persisté depuis
   * E2.3.a.1). Recalcule `family` dans le même `set()`.
   *
   * Réservé aux wallets BIP-39 (EVM/Bitcoin). Sans effet sur les
   * wallets SANGO legacy.
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
      family: "sango",
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
          family: resolveChainFamily(networkId),
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
        // Sécurité : refuse si le wallet actif n'est pas EVM/Bitcoin.
        const { format } = get();
        if (format !== "bip39") {
          console.warn(
            `wallet-store.setNetworkId: ignored (format="${format}", expected "bip39")`,
          );
          return;
        }
        // Recalcule family dans le même set() pour éviter toute
        // fenêtre où (networkId, family) sont incohérents.
        set({
          networkId,
          family: resolveChainFamily(networkId),
        });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: isClient
        ? createJSONStorage(() => localStorage)
        : undefined,
      /**
       * **D-E2.3-1** — seule la préférence de session (`networkId`)
       * est persistée. `family` est dérivée à la rehydratation.
       * Ni wallet, ni format, ni statut, ni activeId.
       */
      partialize: (state) => ({ networkId: state.networkId }),
      /**
       * Au rehydrate, on valide le `networkId` persisté contre les
       * registres EVM/Bitcoin/SANGO. Un `networkId` inconnu est
       * ignoré — on retombe sur la valeur initiale. `family` est
       * recalculée pour cohérence (D-E2.1-18).
       */
      merge: (persisted, current) => {
        const p = persisted as { networkId?: unknown } | undefined;
        const candidate =
          typeof p?.networkId === "string" ? p.networkId : null;
        const valid =
          candidate && isKnownNetworkId(candidate)
            ? candidate
            : current.networkId;
        return {
          ...current,
          networkId: valid,
          family: resolveChainFamily(valid),
        };
      },
    },
  ),
);

/**
 * Arbitre entre la préférence de session (persistée) et le
 * `networkId` structurel du keyring au moment de l'unlock.
 *
 * **D-E2.3-1 + D-E2.1-18** — la préférence de session est acceptée
 * **uniquement si** :
 *   1. elle pointe vers un réseau connu (`isKnownNetworkId`), ET
 *   2. elle appartient à la **même famille** que le keyring.
 *
 * Cela empêche un wallet Bitcoin de se retrouver sur un réseau EVM
 * par préférence résiduelle (et vice-versa) — cas réel dès qu'on
 * ajoute Bitcoin à une app multi-chaînes.
 *
 * `ethereum-sepolia` **n'est pas** un fallback. Un couple
 * (préférence invalide, keyring invalide) signale un état incohérent :
 * on log une erreur explicite plutôt que de masquer le problème.
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

  const keyringFamily = resolveChainFamily(keyringNetworkId);

  // Préférence acceptée seulement si connue ET même famille.
  if (
    sessionPreference &&
    isKnownNetworkId(sessionPreference) &&
    resolveChainFamily(sessionPreference) === keyringFamily
  ) {
    return sessionPreference;
  }

  if (!isKnownNetworkId(keyringNetworkId)) {
    console.error(
      `[wallet-store] keyring networkId "${keyringNetworkId}" is not a known network. ` +
        `Unlocking with the invalid value — downstream reads will fail explicitly.`,
    );
  }
  return keyringNetworkId;
}
