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
 * **Phase 2.1 (D-E2.6-1)** — `walletAccountIndexes` est la **seule**
 * source persistée de l'index HD actif. Clé = `activeId` (ID du
 * keyring, lowercase address). Un `accountIndex` global séparé serait
 * une seconde source de vérité qui pourrait diverger — on l'évite en
 * dérivant l'index actif du record : `walletAccountIndexes[activeId] ?? 0`.

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
   * Index HD du compte actif, PAR wallet keyring ID.
   *
   * **D-E2.6-1** — Source de vérité **unique** pour l'account index.
   * Clé = `activeId` (lowercase address de l'entrée keyring). Un
   * wallet SANGO legacy n'y apparaît jamais (toujours index 0).
   * Persisté en localStorage.
   *
   * Pour lire l'index du wallet courant :
   *   `walletAccountIndexes[activeId] ?? 0`
   */
  walletAccountIndexes: Readonly<Record<string, number>>;
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
   * Change le `networkId` actif (persisté depuis E2.3.a.1).
   * Recalcule `family` dans le même `set()`.
   *
   * **D-E2.1-23** — refusé si :
   *   - le format n'est pas `"bip39"` (SANGO legacy) ;
   *   - le `networkId` cible appartient à une **autre famille** que
   *     le réseau courant (EVM ↔ Bitcoin).
   *
   * Le changement intra-famille est autorisé (ex. EVM : sepolia →
   * bsc, Bitcoin : testnet → mainnet).
   */
  setNetworkId: (networkId: string) => void;

  /**
   * **Phase 2.1 (D-E2.6-1)** — Change l'index HD du compte actif
   * pour le wallet courant (identifié par `activeId`).
   *
   * Refusé si :
   *   - le format n'est pas `"bip39"` (SANGO legacy = index 0 figé) ;
   *   - aucun wallet actif (`activeId` null) ;
   *   - l'index n'est pas un entier ≥ 0.
   *
   * La persistance est automatique (clé `walletAccountIndexes`).
   * L'appelant est responsable d'invalider les queries dépendantes si
   * nécessaire — en pratique, la propagation de `accountIndex` dans
   * les query keys (Phase 2.2) suffit.
   */
  setAccountIndex: (index: number) => void;
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
      walletAccountIndexes: {},

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
        // Sécurité 1 : refuse si le wallet actif n'est pas EVM/Bitcoin.
        const { format, family: currentFamily } = get();
        if (format !== "bip39") {
          console.warn(
            `wallet-store.setNetworkId: ignored (format="${format}", expected "bip39")`,
          );
          return;
        }

        // Sécurité 2 (D-E2.1-23) : refuse un changement de famille.
        // Un sélecteur Bitcoin ne doit pas pouvoir basculer vers EVM,
        // et inversement. Le dispatch par `family` (D-E2.1-18)
        // suppose que la famille reste stable pendant toute la
        // session d'un wallet.
        const nextFamily = resolveChainFamily(networkId);
        if (nextFamily !== currentFamily) {
          console.warn(
            `wallet-store.setNetworkId: ignored cross-family switch ` +
              `(current="${currentFamily}", next="${nextFamily}", networkId="${networkId}")`,
          );
          return;
        }

        // Recalcule family dans le même set() pour éviter toute
        // fenêtre où (networkId, family) sont incohérents. En
        // pratique family ne change pas (garde ci-dessus), mais on
        // garde la cohérence défensive.
        set({
          networkId,
          family: nextFamily,
        });
      },

      setAccountIndex: (index) => {
        const { format, activeId } = get();

        // SANGO legacy = mono-compte, index 0 figé.
        if (format !== "bip39") {
          console.warn(
            `wallet-store.setAccountIndex: ignored (format="${format}", expected "bip39")`,
          );
          return;
        }

        if (!activeId) {
          console.warn(
            "wallet-store.setAccountIndex: ignored (no activeId)",
          );
          return;
        }

        if (!Number.isInteger(index) || index < 0) {
          console.warn(
            `wallet-store.setAccountIndex: ignored (invalid index="${index}")`,
          );
          return;
        }

        set((state) => ({
          walletAccountIndexes: {
            ...state.walletAccountIndexes,
            [activeId]: index,
          },
        }));
      },
    }),
    {
      name: PERSIST_KEY,
      storage: isClient
        ? createJSONStorage(() => localStorage)
        : undefined,
      /**
       * **D-E2.3-1 + D-E2.6-1** — on persiste :
       *   - `networkId` (préférence de session) ;
       *   - `walletAccountIndexes` (index HD par wallet).
       *
       * Ni wallet, ni format, ni statut, ni activeId (session-only).
       * `family` est dérivée à la rehydratation.
       */
      partialize: (state) => ({
        networkId: state.networkId,
        walletAccountIndexes: state.walletAccountIndexes,
      }),
      /**
       * Au rehydrate, on valide le `networkId` persisté contre les
       * registres EVM/Bitcoin/SANGO. Un `networkId` inconnu est
       * ignoré — on retombe sur la valeur initiale. `family` est
       * recalculée pour cohérence (D-E2.1-18).
       */
      merge: (persisted, current) => {
        const p = persisted as
          | {
              networkId?: unknown;
              walletAccountIndexes?: unknown;
            }
          | undefined;

        const candidate =
          typeof p?.networkId === "string" ? p.networkId : null;
        const valid =
          candidate && isKnownNetworkId(candidate)
            ? candidate
            : current.networkId;

        // Sanitize : ne garder que les entrées (string → integer ≥ 0).
        const rawIndexes = p?.walletAccountIndexes;
        const walletAccountIndexes: Record<string, number> = {};
        if (rawIndexes && typeof rawIndexes === "object") {
          for (const [k, v] of Object.entries(rawIndexes)) {
            if (
              typeof k === "string" &&
              k.length > 0 &&
              typeof v === "number" &&
              Number.isInteger(v) &&
              v >= 0
            ) {
              walletAccountIndexes[k] = v;
            }
          }
        }

        return {
          ...current,
          networkId: valid,
          family: resolveChainFamily(valid),
          walletAccountIndexes,
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
