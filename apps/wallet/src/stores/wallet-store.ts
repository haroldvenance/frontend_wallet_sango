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
 * l'UI ni persistée.
 *
 * **Phase 2.3 (D-Phase2-1 + D-Phase2-3.bis)** — multi-comptes HD :
 *
 *   `walletAccounts: Record<walletId, { highestIndex, activeIndex }>`
 *
 *   - `highestIndex` : plus haut index créé par l'utilisateur. Ne
 *     redescend **jamais** en Phase 2 (représente l'historique).
 *   - `activeIndex`  : index actuellement sélectionné (0..highestIndex).
 *
 *   Les comptes sont dérivés à la volée
 *   (`Bip39Wallet.getIdentity(i)`), jamais stockés. Pour SANGO
 *   legacy (mono-compte), aucune entrée n'est créée et l'index est
 *   toujours 0.
 *
 * Deux champs de réseau :
 *   - `networkId` : identifiant canonique wallet-chains (persisté).
 *   - `network`   : label SANGO (HRP bech32m, query keys SANGO).
 */
export type WalletStatus = "no-wallet" | "locked" | "unlocked";

export interface UnlockArgs {
  readonly wallet: AnyWallet;
  readonly id: string;
  readonly format: WalletFormat;
  /**
   * `networkId` **structurel** du wallet (issu du keyring au
   * déverrouillage, ou du formulaire de création).
   */
  readonly networkId: string;
  /** Optionnel — défaut "testnet". Utile uniquement pour SANGO. */
  readonly network?: Network;
}

/**
 * État multi-comptes par wallet (Phase 2.3).
 */
export interface WalletAccountState {
  readonly highestIndex: number;
  readonly activeIndex: number;
}

const DEFAULT_ACCOUNT_STATE: WalletAccountState = Object.freeze({
  highestIndex: 0,
  activeIndex: 0,
});

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
  /**
   * État multi-comptes HD par wallet (D-Phase2-1).
   *
   * **Persisté**. Clé = `activeId`. Un wallet absent du record est
   * traité comme `{ highestIndex: 0, activeIndex: 0 }`.
   */
  walletAccounts: Record<string, WalletAccountState>;

  // Actions
  unlock: (args: UnlockArgs) => void;
  lock: () => void;
  noWallet: () => void;
  setNetwork: (network: Network) => void;
  /**
   * Change le `networkId` actif (persisté depuis E2.3.a.1).
   *
   * **D-E2.1-23** — refusé si :
   *   - format ≠ "bip39" (SANGO legacy) ;
   *   - changement cross-family (EVM ↔ Bitcoin).
   */
  setNetworkId: (networkId: string) => void;
  /**
   * Change le compte actif (Phase 2.3).
   *
   * **D-Phase2-4.bis** — validation `0 <= index <= highestIndex`.
   * Refuse si SANGO legacy ou `activeId` null.
   */
  setAccountIndex: (index: number) => void;
  /**
   * Ajoute un nouveau compte (Phase 2.3).
   *
   * **D-Phase2-4** — `highestIndex + 1`, activé immédiatement.
   */
  addAccount: () => void;
}

/**
 * Sélecteur React-free : renvoie l'index de compte actif pour
 * l'`activeId` courant (ou `0` si non résolu).
 */
export function selectActiveAccountIndex(state: WalletState): number {
  if (!state.activeId) return 0;
  const entry = state.walletAccounts[state.activeId];
  return entry?.activeIndex ?? 0;
}

/**
 * Sélecteur React-free : renvoie l'état multi-comptes du wallet
 * actif (ou le défaut si non résolu).
 */
export function selectActiveAccountState(
  state: WalletState,
): WalletAccountState {
  if (!state.activeId) return DEFAULT_ACCOUNT_STATE;
  return state.walletAccounts[state.activeId] ?? DEFAULT_ACCOUNT_STATE;
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
      walletAccounts: {},

      unlock: ({ wallet, id, format, networkId: keyringNetworkId, network }) => {
        const networkId = resolveUnlockedNetworkId(
          format,
          keyringNetworkId,
          get().networkId,
        );
        // D-Phase2-1 : garantit que chaque wallet a son entrée.
        // Les wallets existants héritent du défaut.
        set((state) => ({
          wallet,
          format,
          networkId,
          family: resolveChainFamily(networkId),
          network: network ?? "testnet",
          status: "unlocked",
          activeId: id,
          walletAccounts: state.walletAccounts[id]
            ? state.walletAccounts
            : { ...state.walletAccounts, [id]: DEFAULT_ACCOUNT_STATE },
        }));
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
        const { format, family: currentFamily } = get();
        if (format !== "bip39") {
          console.warn(
            `wallet-store.setNetworkId: ignored (format="${format}", expected "bip39")`,
          );
          return;
        }

        const nextFamily = resolveChainFamily(networkId);
        if (nextFamily !== currentFamily) {
          console.warn(
            `wallet-store.setNetworkId: ignored cross-family switch ` +
              `(current="${currentFamily}", next="${nextFamily}", networkId="${networkId}")`,
          );
          return;
        }

        set({ networkId, family: nextFamily });
      },

      setAccountIndex: (index) => {
        const { format, activeId, walletAccounts } = get();

        if (format !== "bip39") {
          console.warn(
            `wallet-store.setAccountIndex: ignored (format="${format}", expected "bip39")`,
          );
          return;
        }

        if (!activeId) {
          console.warn("wallet-store.setAccountIndex: ignored (no activeId)");
          return;
        }

        const entry = walletAccounts[activeId] ?? DEFAULT_ACCOUNT_STATE;
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index > entry.highestIndex
        ) {
          console.warn(
            `wallet-store.setAccountIndex: ignored (index=${index}, ` +
              `valid range 0..${entry.highestIndex})`,
          );
          return;
        }

        set({
          walletAccounts: {
            ...walletAccounts,
            [activeId]: { ...entry, activeIndex: index },
          },
        });
      },

      addAccount: () => {
        const { format, activeId, walletAccounts } = get();

        if (format !== "bip39") {
          console.warn(
            `wallet-store.addAccount: ignored (format="${format}", expected "bip39")`,
          );
          return;
        }

        if (!activeId) {
          console.warn("wallet-store.addAccount: ignored (no activeId)");
          return;
        }

        const entry = walletAccounts[activeId] ?? DEFAULT_ACCOUNT_STATE;
        const newIndex = entry.highestIndex + 1;
        set({
          walletAccounts: {
            ...walletAccounts,
            [activeId]: {
              highestIndex: newIndex,
              activeIndex: newIndex,
            },
          },
        });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: isClient
        ? createJSONStorage(() => localStorage)
        : undefined,
      /**
       * **D-E2.3-1 + D-Phase2-1** — seules les préférences de session
       * (`networkId`, `walletAccounts`) sont persistées. `family` est
       * dérivée à la rehydratation.
       */
      partialize: (state) => ({
        networkId: state.networkId,
        walletAccounts: state.walletAccounts,
      }),
      /**
       * Rehydrate : valide `networkId` (registre) et sanitize
       * `walletAccounts` (structure `{highestIndex, activeIndex}`
         * avec entiers ≥ 0). Compat : l'ancien format de la Phase 2.1
         * (Record<string, number>) est **ignoré** — les wallets repartent sur
       * est **ignoré** — les wallets repartent sur
       * `{ highestIndex: 0, activeIndex: 0 }`.
       */
      merge: (persisted, current) => {
        const p = persisted as
          | {
              networkId?: unknown;
              walletAccounts?: unknown;
            }
          | undefined;

        const candidate =
          typeof p?.networkId === "string" ? p.networkId : null;
        const valid =
          candidate && isKnownNetworkId(candidate)
            ? candidate
            : current.networkId;

        const rawAccounts = p?.walletAccounts;
        const walletAccounts: Record<string, WalletAccountState> = {};
        if (rawAccounts && typeof rawAccounts === "object") {
          for (const [k, v] of Object.entries(rawAccounts)) {
            if (
              typeof k === "string" &&
              k.length > 0 &&
              v &&
              typeof v === "object" &&
              typeof (v as { highestIndex?: unknown }).highestIndex ===
                "number" &&
              typeof (v as { activeIndex?: unknown }).activeIndex ===
                "number"
            ) {
              const entry = v as WalletAccountState;
              const highest = Math.max(0, Math.floor(entry.highestIndex));
              const activeRaw = Math.max(0, Math.floor(entry.activeIndex));
              const active = Math.min(activeRaw, highest);
              walletAccounts[k] = { highestIndex: highest, activeIndex: active };
            }
          }
        }

        return {
          ...current,
          networkId: valid,
          family: resolveChainFamily(valid),
          walletAccounts,
        };
      },
    },
  ),
);

/**
 * Arbitre entre la préférence de session (persistée) et le
 * `networkId` structurel du keyring au moment de l'unlock.
 *
 * **D-E2.3-1 + D-E2.1-18** — la préférence est acceptée si :
 *   1. elle pointe vers un réseau connu (`isKnownNetworkId`), ET
 *   2. elle appartient à la **même famille** que le keyring.
 */
function resolveUnlockedNetworkId(
  format: WalletFormat,
  keyringNetworkId: string,
  sessionPreference: string,
): string {
  if (format !== "bip39") {
    return keyringNetworkId;
  }

  const keyringFamily = resolveChainFamily(keyringNetworkId);

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
