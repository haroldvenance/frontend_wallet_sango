import type { Network } from "@sango/types";
import type { Bip39Wallet, Wallet, WalletFormat } from "@sango/wallet-core";
import type { ChainFamily } from "@sango/wallet-chains";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { isKnownNetworkId, resolveChainFamily } from "@/lib/chain-family";

export type AnyWallet = Wallet | Bip39Wallet;

export type WalletStatus = "no-wallet" | "locked" | "unlocked";

/**
 * État runtime d'un wallet déverrouillé. **Jamais persisté.**
 */
export interface UnlockedWalletEntry {
  readonly wallet: AnyWallet;
  readonly format: WalletFormat;
  readonly networkId: string;
  readonly label: string;
  readonly createdAt: number;
}

export interface UnlockedWalletArg {
  readonly id: string;
  readonly wallet: AnyWallet;
  readonly format: WalletFormat;
  readonly networkId: string;
  readonly label: string;
  readonly createdAt: number;
}

export interface UnlockArgs {
  readonly wallets: readonly UnlockedWalletArg[];
}

export interface WalletAccountState {
  readonly highestIndex: number;
  readonly activeIndex: number;
}

const DEFAULT_ACCOUNT_STATE: WalletAccountState = Object.freeze({
  highestIndex: 0,
  activeIndex: 0,
});

const PERSIST_KEY = "sango.wallet-session.v1";
const PERSIST_VERSION = 1;
const isClient = typeof window !== "undefined";

/**
 * Détruit un wallet avec isolation : un throw sur un wallet ne doit
 * JAMAIS empêcher la destruction des autres (sinon des secrets
 * restent en mémoire).
 */
function safeDestroy(wallet: AnyWallet, id: string): void {
  try {
    wallet.destroy();
  } catch (err) {
    // Log dev-only, jamais l'ID en prod (peut matcher une adresse).
    if (import.meta.env.DEV) {
      console.warn(`[wallet-store] destroy failed for wallet ${id}`, err);
    }
  }
}

function resolveSangoLabel(networkId: string): Network {
  return networkId === "sango-mainnet" ? "mainnet" : "testnet";
}

function pickEffectiveNetworkId(args: {
  readonly format: WalletFormat;
  readonly keyringNetworkId: string;
  readonly preferredNetworkId: string | undefined;
}): string {
  const { format, keyringNetworkId, preferredNetworkId } = args;
  if (format !== "bip39") return keyringNetworkId;
  if (!preferredNetworkId) return keyringNetworkId;
  if (!isKnownNetworkId(preferredNetworkId)) return keyringNetworkId;
  return preferredNetworkId;
}

export interface WalletState {
  // Runtime (jamais persisté)
  wallets: Record<string, UnlockedWalletEntry>;
  wallet: AnyWallet | null;

  // Persisté (préférences non sensibles)
  activeId: string | null;
  walletAccounts: Record<string, WalletAccountState>;
  walletNetworks: Record<string, string>;

  // Dérivé, non persisté
  format: WalletFormat | null;
  networkId: string;
  family: ChainFamily;
  network: Network;
  status: WalletStatus;

  // Actions
  unlock: (args: UnlockArgs) => void;
  addWallet: (entry: UnlockedWalletArg) => void;
  lock: () => void;
  noWallet: () => void;
  switchWallet: (id: string) => void;
  forgetWallet: (id: string) => void;
  setNetworkId: (networkId: string) => void;
  setAccountIndex: (index: number) => void;
  addAccount: () => void;
}

export function selectActiveAccountIndex(state: WalletState): number {
  if (!state.activeId) return 0;
  const entry = state.walletAccounts[state.activeId];
  return entry?.activeIndex ?? 0;
}

export function selectActiveAccountState(
  state: WalletState,
): WalletAccountState {
  if (!state.activeId) return DEFAULT_ACCOUNT_STATE;
  return state.walletAccounts[state.activeId] ?? DEFAULT_ACCOUNT_STATE;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallets: {},
      wallet: null,

      activeId: null,
      walletAccounts: {},
      walletNetworks: {},

      format: null,
      networkId: "sango-devnet",
      family: "sango",
      network: "testnet",
      status: "no-wallet",

      unlock: (args) => {
        const list = args.wallets;
        if (list.length === 0) return;

        const {
          activeId: persistedActiveId,
          walletAccounts,
          walletNetworks,
        } = get();

        const wallets: Record<string, UnlockedWalletEntry> = {};
        for (const w of list) {
          wallets[w.id] = {
            wallet: w.wallet,
            format: w.format,
            networkId: w.networkId,
            label: w.label,
            createdAt: w.createdAt,
          };
        }

        const activeId =
          persistedActiveId && wallets[persistedActiveId]
            ? persistedActiveId
            : list[0]!.id;

        const active = wallets[activeId]!;
        const effectiveNetworkId = pickEffectiveNetworkId({
          format: active.format,
          keyringNetworkId: active.networkId,
          preferredNetworkId: walletNetworks[activeId],
        });

        set({
          wallets,
          wallet: active.wallet,
          format: active.format,
          activeId,
          networkId: effectiveNetworkId,
          family: resolveChainFamily(effectiveNetworkId),
          network: resolveSangoLabel(effectiveNetworkId),
          status: "unlocked",
          walletAccounts: walletAccounts[activeId]
            ? walletAccounts
            : { ...walletAccounts, [activeId]: DEFAULT_ACCOUNT_STATE },
          walletNetworks: {
            ...walletNetworks,
            [activeId]: effectiveNetworkId,
          },
        });
      },

      addWallet: (entry) => {
        const { wallets, walletAccounts, walletNetworks } = get();
        if (wallets[entry.id]) {
          if (import.meta.env.DEV) {
            console.warn(
              `[wallet-store] addWallet: id already in runtime, ignored`,
            );
          }
          return;
        }

        const nextWallets: Record<string, UnlockedWalletEntry> = {
          ...wallets,
          [entry.id]: {
            wallet: entry.wallet,
            format: entry.format,
            networkId: entry.networkId,
            label: entry.label,
            createdAt: entry.createdAt,
          },
        };

        const effectiveNetworkId = pickEffectiveNetworkId({
          format: entry.format,
          keyringNetworkId: entry.networkId,
          preferredNetworkId: walletNetworks[entry.id],
        });

        set({
          wallets: nextWallets,
          wallet: entry.wallet,
          format: entry.format,
          activeId: entry.id,
          networkId: effectiveNetworkId,
          family: resolveChainFamily(effectiveNetworkId),
          network: resolveSangoLabel(effectiveNetworkId),
          status: "unlocked",
          walletAccounts: walletAccounts[entry.id]
            ? walletAccounts
            : { ...walletAccounts, [entry.id]: DEFAULT_ACCOUNT_STATE },
          walletNetworks: {
            ...walletNetworks,
            [entry.id]: effectiveNetworkId,
          },
        });
      },

      /**
       * Verrouille la session : détruit TOUS les wallets, y compris
       * si `destroy()` throw sur l'un d'eux (isolation par wallet).
       * Les préférences (activeId, walletAccounts, walletNetworks)
       * sont préservées — elles ne contiennent aucun secret.
       */
      lock: () => {
        const { wallets } = get();
        for (const [id, entry] of Object.entries(wallets)) {
          safeDestroy(entry.wallet, id);
        }
        set({
          wallets: {},
          wallet: null,
          format: null,
          status: "locked",
        });
      },

      /**
       * Réinitialisation complète (DangerZone « Effacer toutes les
       * données locales »). Détruit les wallets résiduels (au cas où
       * `lock()` aurait été contourné) puis vide les préférences
       * persistées.
       */
      noWallet: () => {
        const { wallets } = get();
        for (const [id, entry] of Object.entries(wallets)) {
          safeDestroy(entry.wallet, id);
        }
        set({
          wallets: {},
          wallet: null,
          format: null,
          status: "no-wallet",
          activeId: null,
          walletAccounts: {},
          walletNetworks: {},
        });
      },

      switchWallet: (id) => {
        const { wallets, walletAccounts, walletNetworks } = get();
        const target = wallets[id];
        if (!target) {
          if (import.meta.env.DEV) {
            console.warn(`[wallet-store] switchWallet: unknown id`);
          }
          return;
        }
        if (get().activeId === id) return;

        const effectiveNetworkId = pickEffectiveNetworkId({
          format: target.format,
          keyringNetworkId: target.networkId,
          preferredNetworkId: walletNetworks[id],
        });

        set({
          wallet: target.wallet,
          format: target.format,
          activeId: id,
          networkId: effectiveNetworkId,
          family: resolveChainFamily(effectiveNetworkId),
          network: resolveSangoLabel(effectiveNetworkId),
          walletAccounts: walletAccounts[id]
            ? walletAccounts
            : { ...walletAccounts, [id]: DEFAULT_ACCOUNT_STATE },
          walletNetworks: {
            ...walletNetworks,
            [id]: effectiveNetworkId,
          },
        });
      },

      forgetWallet: (id) => {
        const { wallets, activeId, walletAccounts, walletNetworks } = get();

        const nextWallets = { ...wallets };
        const target = nextWallets[id];
        if (!target) {
          if (import.meta.env.DEV) {
            console.warn(`[wallet-store] forgetWallet: unknown id`);
          }
          return;
        }

        // Détruire AVANT la suppression (sinon secrets orphelins).
        safeDestroy(target.wallet, id);
        delete nextWallets[id];

        const nextAccounts = { ...walletAccounts };
        delete nextAccounts[id];
        const nextNetworks = { ...walletNetworks };
        delete nextNetworks[id];

        if (activeId === id) {
          const remainingIds = Object.keys(nextWallets);
          if (remainingIds.length === 0) {
            set({
              wallets: {},
              wallet: null,
              format: null,
              activeId: null,
              status: "locked",
              walletAccounts: nextAccounts,
              walletNetworks: nextNetworks,
            });
            return;
          }
          const remaining = remainingIds
            .map((rid) => ({
              id: rid,
              createdAt: nextWallets[rid]!.createdAt,
            }))
            .sort((a, b) => a.createdAt - b.createdAt);
          const nextActiveId = remaining[0]!.id;
          const next = nextWallets[nextActiveId]!;
          const effectiveNetworkId = pickEffectiveNetworkId({
            format: next.format,
            keyringNetworkId: next.networkId,
            preferredNetworkId: nextNetworks[nextActiveId],
          });
          set({
            wallets: nextWallets,
            wallet: next.wallet,
            format: next.format,
            activeId: nextActiveId,
            networkId: effectiveNetworkId,
            family: resolveChainFamily(effectiveNetworkId),
            network: resolveSangoLabel(effectiveNetworkId),
            walletAccounts: nextAccounts,
            walletNetworks: nextNetworks,
          });
        } else {
          set({
            wallets: nextWallets,
            walletAccounts: nextAccounts,
            walletNetworks: nextNetworks,
          });
        }
      },

      setNetworkId: (networkId) => {
        const { format, activeId, walletNetworks } = get();

        if (format !== "bip39") {
          if (import.meta.env.DEV) {
            console.warn(
              `[wallet-store] setNetworkId: ignored for legacy wallet`,
            );
          }
          return;
        }

        if (!isKnownNetworkId(networkId)) {
          if (import.meta.env.DEV) {
            console.warn(`[wallet-store] setNetworkId: unknown networkId`);
          }
          return;
        }

        set({
          networkId,
          family: resolveChainFamily(networkId),
          network: resolveSangoLabel(networkId),
          walletNetworks: activeId
            ? { ...walletNetworks, [activeId]: networkId }
            : walletNetworks,
        });
      },

      setAccountIndex: (index) => {
        const { format, activeId, walletAccounts } = get();

        if (format !== "bip39" || !activeId) return;

        const entry = walletAccounts[activeId] ?? DEFAULT_ACCOUNT_STATE;
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index > entry.highestIndex
        ) {
          if (import.meta.env.DEV) {
            console.warn(`[wallet-store] setAccountIndex: out of range`);
          }
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

        if (format !== "bip39" || !activeId) return;

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
      version: PERSIST_VERSION,
      storage: isClient
        ? createJSONStorage(() => localStorage)
        : undefined,

      /**
       * Seules les préférences non sensibles sont persistées.
       * Aucun wallet, seed, mnemonic ou password n'apparaît ici.
       */
      partialize: (state) => ({
        activeId: state.activeId,
        walletAccounts: state.walletAccounts,
        walletNetworks: state.walletNetworks,
      }),

      merge: (persisted, current) => {
        const p = persisted as
          | {
              activeId?: unknown;
              walletAccounts?: unknown;
              walletNetworks?: unknown;
              networkId?: unknown; // legacy E2.3.a.1
            }
          | undefined;

        const activeId =
          typeof p?.activeId === "string" && p.activeId.length > 0
            ? p.activeId
            : null;

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
              const active = Math.min(
                Math.max(0, Math.floor(entry.activeIndex)),
                highest,
              );
              walletAccounts[k] = {
                highestIndex: highest,
                activeIndex: active,
              };
            }
          }
        }

        const rawNetworks = p?.walletNetworks;
        const walletNetworks: Record<string, string> = {};
        if (rawNetworks && typeof rawNetworks === "object") {
          for (const [k, v] of Object.entries(rawNetworks)) {
            if (
              typeof k === "string" &&
              k.length > 0 &&
              typeof v === "string" &&
              isKnownNetworkId(v)
            ) {
              walletNetworks[k] = v;
            }
          }
        }

        // Migration legacy : l'ancien `networkId` top-level devient
        // `walletNetworks[activeId]` s'il n'existe pas déjà.
        if (
          activeId &&
          !walletNetworks[activeId] &&
          typeof p?.networkId === "string" &&
          isKnownNetworkId(p.networkId)
        ) {
          walletNetworks[activeId] = p.networkId;
        }

        return {
          ...current,
          activeId,
          walletAccounts,
          walletNetworks,
        };
      },
    },
  ),
);