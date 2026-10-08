import type { Network } from "@sango/types";
import type { Bip39Wallet, Wallet, WalletFormat } from "@sango/wallet-core";
import type { ChainFamily } from "@sango/wallet-chains";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { isKnownNetworkId, resolveChainFamily } from "@/lib/chain-family";

/**
 * Union des wallets supportés (legacy SANGO + BIP-39 EVM/Bitcoin).
 */
export type AnyWallet = Wallet | Bip39Wallet;

/**
 * État de session du wallet (Phase 3.1 — multi-wallet keyring).
 *
 * **Modèle** :
 *   - `wallets` : map runtime des wallets **déverrouillés** (en
 *     mémoire, jamais persistés). Clé = `KeyringEntry.id`.
 *   - `wallet` : raccourci vers `wallets[activeId].wallet`. **Jamais
 *     une source indépendante** — toujours mis à jour atomiquement
 *     avec `activeId`.
 *   - `activeId` : identifiant de l'entrée keyring active. **Persisté**
 *     pour restaurer le dernier wallet utilisé après un `lock()` +
 *     `unlock()`.
 *   - `walletAccounts` : état HD par wallet (Phase 2.3). **Persisté**.
 *   - `walletNetworks` : réseau courant **par wallet** (Phase 3.1).
 *     **Persisté**. Seeded depuis `UnlockedWalletEntry.networkId` à la
 *     première rencontre, puis préférence utilisateur.
 *   - `networkId`, `format`, `family`, `network`, `status` : **état
 *     effectif du wallet actif**, toujours recalculé atomiquement par
 *     `unlock()` / `switchWallet()` / `setNetworkId()` / `lock()`.
 *
 * **Sécurité** :
 *   - `wallets`, `wallet`, seeds, mnemonics : **runtime-only**,
 *     détruits par `lock()`.
 *   - `activeId`, `walletAccounts`, `walletNetworks` : persistés en
 *     localStorage. Aucun secret.
 *
 * **Sémantique "session keyring" (D-Phase3-1)** : un `unlock(password)`
 * déverrouille **toutes** les entrées qui matchent. `switchWallet(id)`
 * est un simple changement de référence — aucun re-prompt, aucun
 * déchiffrement.
 */
export type WalletStatus = "no-wallet" | "locked" | "unlocked";

/**
 * État runtime d'un wallet déverrouillé. **Jamais persisté.**
 */
export interface UnlockedWalletEntry {
  readonly wallet: AnyWallet;
  readonly format: WalletFormat;
  /**
   * `networkId` **structurel** du wallet (issu du keyring). Sert de
   * seed initial pour `walletNetworks[id]` — une fois que l'utilisateur
   * change de réseau, `walletNetworks[id]` fait foi.
   */
  readonly networkId: string;
  readonly label: string;
  readonly createdAt: number;
}

/**
 * Argument d'unlock pour un wallet déverrouillé (nouveau format).
 * Équivaut à `UnlockedWalletEntry` + `id`.
 */
export interface UnlockedWalletArg {
  readonly id: string;
  readonly wallet: AnyWallet;
  readonly format: WalletFormat;
  readonly networkId: string;
  readonly label: string;
  readonly createdAt: number;
}

/**
 * Forme canonique de `unlock()` : plusieurs wallets déverrouillés en
 * une passe (session keyring).
 *
 * **D-Phase3-5** — depuis la clôture de Phase 3, c'est la seule forme.
 * L'ancien mode mono-wallet (`{ wallet, id, format, networkId }`,
 * E1 → Phase 3.4) a été retiré : tous les call sites (`unlock.tsx`,
 * `create-unified.tsx`, `import-evm.tsx`, `import-sango.tsx`,
 * `import-bitcoin.tsx`) ont migré.
 */
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

interface WalletState {
  // ── Runtime (jamais persisté) ─────────────────────────────
  /** Wallets déverrouillés, clé = `KeyringEntry.id`. */
  wallets: Record<string, UnlockedWalletEntry>;
  /**
   * Raccourci vers `wallets[activeId].wallet`. Toujours cohérent avec
   * `activeId` — ne jamais muter indépendamment.
   */
  wallet: AnyWallet | null;

  // ── Préférences persistées ────────────────────────────────
  /** Entrée keyring du wallet actif (persistée pour restore). */
  activeId: string | null;
  /** État HD par wallet (Phase 2.3). */
  walletAccounts: Record<string, WalletAccountState>;
  /** Réseau courant par wallet (Phase 3.1). */
  walletNetworks: Record<string, string>;

  // ── État effectif du wallet actif (dérivé, non persisté) ─
  format: WalletFormat | null;
  networkId: string;
  family: ChainFamily;
  network: Network;
  status: WalletStatus;

  // ── Actions ───────────────────────────────────────────────
  unlock: (args: UnlockArgs) => void;
  lock: () => void;
  noWallet: () => void;
  switchWallet: (id: string) => void;
  forgetWallet: (id: string) => void;
  setNetwork: (network: Network) => void;
  setNetworkId: (networkId: string) => void;
  setAccountIndex: (index: number) => void;
  addAccount: () => void;
}

/**
 * Sélecteur : index de compte actif du wallet courant (ou 0).
 */
export function selectActiveAccountIndex(state: WalletState): number {
  if (!state.activeId) return 0;
  const entry = state.walletAccounts[state.activeId];
  return entry?.activeIndex ?? 0;
}

/**
 * Sélecteur : état HD du wallet courant (ou défaut).
 */
export function selectActiveAccountState(
  state: WalletState,
): WalletAccountState {
  if (!state.activeId) return DEFAULT_ACCOUNT_STATE;
  return state.walletAccounts[state.activeId] ?? DEFAULT_ACCOUNT_STATE;
}

/**
 * Dérive le label SANGO (`Network`) depuis un `networkId`.
 *
 * Utilisé pour peupler `WalletState.network` (HRP bech32m). Pour les
 * réseaux non-SANGO, retourne `"testnet"` (valeur neutre — les hooks
 * EVM/Bitcoin lisent `networkId`, pas `network`).
 */
function resolveSangoLabel(networkId: string): Network {
  return networkId === "sango-mainnet" ? "mainnet" : "testnet";
}

/**
 * Choisit le `networkId` effectif pour un wallet donné.
 *
 * Préserve l'invariant **D-E2.3-1** : une préférence invalide ou
 * cross-family est ignorée au profit du `networkId` structurel du
 * keyring. Les wallets SANGO legacy ignorent toute préférence
 * (pas de switch réseau supporté).
 *
 * La préférence vient de `walletNetworks[id]` (persisté). Le fallback
 * est `UnlockedWalletEntry.networkId` (issu du keyring, non validé —
 * c'est la source structurelle du wallet).
 */
function pickEffectiveNetworkId(args: {
  readonly format: WalletFormat;
  readonly keyringNetworkId: string;
  readonly preferredNetworkId: string | undefined;
}): string {
  const { format, keyringNetworkId, preferredNetworkId } = args;
  if (format !== "bip39") return keyringNetworkId;
  if (!preferredNetworkId) return keyringNetworkId;
  if (!isKnownNetworkId(preferredNetworkId)) return keyringNetworkId;
  if (
    resolveChainFamily(preferredNetworkId) !==
    resolveChainFamily(keyringNetworkId)
  ) {
    return keyringNetworkId;
  }
  return preferredNetworkId;
}

const PERSIST_KEY = "sango.wallet-session.v1";
const isClient = typeof window !== "undefined";

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Runtime
      wallets: {},
      wallet: null,

      // Persisté
      activeId: null,
      walletAccounts: {},
      walletNetworks: {},

      // État effectif
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

        // Restaure le dernier wallet actif si toujours présent,
        // sinon prend le premier déverrouillé.
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

      lock: () => {
        // Détruit toutes les instances déverrouillées.
        const { wallets } = get();
        for (const entry of Object.values(wallets)) {
          entry.wallet.destroy();
        }
        // Préférences préservées : activeId, walletAccounts, walletNetworks.
        set({
          wallets: {},
          wallet: null,
          format: null,
          status: "locked",
        });
      },

      noWallet: () =>
        set({
          wallets: {},
          wallet: null,
          format: null,
          status: "no-wallet",
          activeId: null,
        }),

      switchWallet: (id) => {
        const { wallets, walletAccounts, walletNetworks } = get();
        const target = wallets[id];
        if (!target) {
          console.warn(
            `wallet-store.switchWallet: unknown id "${id}" (not unlocked)`,
          );
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
          console.warn(
            `wallet-store.forgetWallet: unknown id "${id}"`,
          );
          return;
        }

        // Détruit l'instance si elle existe.
        target.wallet.destroy();
        delete nextWallets[id];

        const nextAccounts = { ...walletAccounts };
        delete nextAccounts[id];
        const nextNetworks = { ...walletNetworks };
        delete nextNetworks[id];

        if (activeId === id) {
          const remainingIds = Object.keys(nextWallets);
          if (remainingIds.length === 0) {
            // Plus aucun wallet : on repasse en locked (mais garde
            // les préférences des autres wallets, nettoyées).
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
          // D-Phase3-4 (D24·B) — le prochain wallet actif est le plus
          // ancien restant par `createdAt` (cohérent avec le tri de
          // `useWallets()`), pas `Object.keys()[0]` (ordre d'insertion).
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

      setNetwork: (network) => set({ network }),

      setNetworkId: (networkId) => {
        const {
          format,
          family: currentFamily,
          activeId,
          walletNetworks,
        } = get();

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

        set({
          networkId,
          family: nextFamily,
          network: resolveSangoLabel(networkId),
          walletNetworks: activeId
            ? { ...walletNetworks, [activeId]: networkId }
            : walletNetworks,
        });
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
            `wallet-store.setAccountIndex: ignored (index=${index}, valid range 0..${entry.highestIndex})`,
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
       * **D-Phase3-1** — seules les préférences **non-sensibles** sont
       * persistées :
       *   - `activeId` (restore du dernier wallet utilisé) ;
       *   - `walletAccounts` (Phase 2.3) ;
       *   - `walletNetworks` (Phase 3.1).
       *
       * ⚠️ Jamais persisté : `wallets`, `wallet`, seeds, mnemonics,
       * passwords. Cf. `UnlockedWalletEntry`.
       */
      partialize: (state) => ({
        activeId: state.activeId,
        walletAccounts: state.walletAccounts,
        walletNetworks: state.walletNetworks,
      }),
      /**
       * Rehydrate : sanitize `activeId`, `walletAccounts`,
       * `walletNetworks`. Compat E2.3.a.1 : l'ancien `networkId`
       * persisté est migré vers `walletNetworks[activeId]` s'il existe.
       */
      merge: (persisted, current) => {
        const p = persisted as
          | {
              activeId?: unknown;
              walletAccounts?: unknown;
              walletNetworks?: unknown;
              networkId?: unknown; // legacy E2.3.a.1
            }
          | undefined;

        // activeId : string non vide ou null.
        const activeId =
          typeof p?.activeId === "string" && p.activeId.length > 0
            ? p.activeId
            : null;

        // walletAccounts : Record<string, {highestIndex, activeIndex}>.
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

        // walletNetworks : Record<string, networkId connu>.
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

        // Migration E2.3.a.1 : si l'ancien `networkId` persisté est
        // connu et qu'on a un `activeId`, on seed `walletNetworks`.
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
          // Note : `networkId`, `family`, `network` restent à leurs
          // valeurs initiales tant que `unlock()` n'a pas été appelé.
        };
      },
    },
  ),
);
