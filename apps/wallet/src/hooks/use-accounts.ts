import { useMemo } from "react";

import { useQueries } from "@tanstack/react-query";
import { Bip39Wallet } from "@sango/wallet-core";
import type { BitcoinNetwork } from "@sango/wallet-core";
import type {
  AccountRef,
  AssetRef,
  ChainFamily,
} from "@sango/wallet-chains";

import { resolveChainFamily } from "@/lib/chain-family";
import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Vue UI de la liste des comptes d'un wallet BIP-39.
 *
 * **D-Phase2-3** — couche **UI** : elle orchestre plusieurs
 * `AccountRef` (un par index) et lit les balances en parallèle.
 *
 * **D-Phase3-3 (D15)** — accepte un `walletId` optionnel :
 *   - `useAccounts()` → comptes du wallet **actif** (`activeId`) ;
 *   - `useAccounts("0xabc")` → comptes de ce wallet précis.
 *
 * L'appel sans argument préserve le contrat Phase 2.3 (utilisé
 * historiquement par l'ancien `AccountSwitcher`, supprimé en Phase 3.5).
 *
 * **Limites Phase 3.3** :
 *   - `setAccountIndex` / `addAccount` du store opèrent sur `activeId`.
 *     En 3.3 le wallet déplié est toujours l'actif (D10·A) → OK.
 *     Si un jour un wallet non-actif est dépliable, il faudra étendre
 *     le store.
 *   - `enabled: false` coupe les `useQueries` — utile pour ne charger
 *     les balances que du wallet déplié (D7).
 *
 * Retourne `null` pour SANGO legacy (`format !== "bip39"`).
 */

export interface AccountEntry {
  readonly index: number;
  readonly address: string;
  readonly balance: bigint | null;
  readonly loading: boolean;
}

export interface UseAccountsResult {
  readonly accounts: readonly AccountEntry[];
  readonly activeIndex: number;
  readonly switchAccount: (index: number) => void;
  readonly addAccount: () => void;
}

export interface UseAccountsOptions {
  /**
   * Force la désactivation des queries (ex. wallet replié dans la
   * modal). Défaut `true` — les queries sont actives si les autres
   * conditions sont remplies.
   */
  readonly enabled?: boolean;
}

const REFRESH_MS = 15_000;

/**
 * État HD par défaut — miroir de `DEFAULT_ACCOUNT_STATE` du store
 * (non exporté pour ne pas ajouter de surface publique en 3.3).
 */
function defaultAccountState() {
  return { highestIndex: 0, activeIndex: 0 };
}

export function useAccounts(
  walletId?: string,
  opts: UseAccountsOptions = {},
): UseAccountsResult | null {
  const session = useWalletSession();
  const wallets = useWalletStore((s) => s.wallets);
  const activeId = useWalletStore((s) => s.activeId);
  const walletAccountsMap = useWalletStore((s) => s.walletAccounts);
  const walletNetworksMap = useWalletStore((s) => s.walletNetworks);
  const setAccountIndex = useWalletStore((s) => s.setAccountIndex);
  const addAccountStore = useWalletStore((s) => s.addAccount);

  const ctx = useNetworkQueryContext();

  // Wallet ciblé : explicite ou actif.
  const effectiveId = walletId ?? activeId;
  const entry = effectiveId ? wallets[effectiveId] : undefined;

  // Réseau effectif du wallet ciblé (préférence > structurel > contexte).
  const targetNetworkId = walletId
    ? (walletNetworksMap[walletId] ?? entry?.networkId ?? ctx.networkId)
    : ctx.networkId;
  const targetFamily: ChainFamily = walletId
    ? resolveChainFamily(targetNetworkId)
    : ctx.family;
  const targetEndpoint = walletId ? ctx.endpoint : ctx.endpoint;

  const activeState =
    effectiveId && walletAccountsMap[effectiveId]
      ? walletAccountsMap[effectiveId]!
      : defaultAccountState();

  const isBip39 = entry?.format === "bip39";
  const walletInstance = entry?.wallet ?? null;
  const bip39Wallet =
    walletInstance instanceof Bip39Wallet ? walletInstance : null;

  const externallyEnabled = opts.enabled ?? true;

  // Liste 0..highestIndex (borné par highestIndex, pas par solde).
  const indexes = useMemo(
    () =>
      Array.from({ length: activeState.highestIndex + 1 }, (_, i) => i),
    [activeState.highestIndex],
  );

  // Adresses dérivées à la volée.
  const addresses = useMemo(() => {
    if (!bip39Wallet) return [];
    return indexes.map((i) =>
      deriveAddress(bip39Wallet, targetFamily, targetNetworkId, i),
    );
  }, [bip39Wallet, targetFamily, targetNetworkId, indexes]);

  // Native assetId pour EVM (BSC → "bnb", sinon "eth").
  const nativeAssetId = useMemo(() => {
    if (targetFamily !== "evm") return null;
    if (targetNetworkId === "bsc" || targetNetworkId === "bsc-testnet") {
      return "bnb";
    }
    return "eth";
  }, [targetFamily, targetNetworkId]);

  const enabled =
    externallyEnabled &&
    Boolean(session) &&
    isBip39 &&
    targetFamily !== "sango";

  const balanceQueries = useQueries({
    queries: indexes.map((i) => ({
      queryKey: networkQueryKey(
        // D15 — `effectiveId` dans la clé : deux wallets sur le même
        // réseau ne partagent pas de cache.
        ["multi-account-balance", effectiveId ?? ""],
        targetEndpoint,
        targetNetworkId,
        i,
      ),
      queryFn: async (): Promise<bigint | null> => {
        if (!session) return null;
        const ref: AssetRef =
          targetFamily === "bitcoin"
            ? { kind: "native", assetId: "btc", networkId: targetNetworkId }
            : {
                kind: "native",
                assetId: nativeAssetId ?? "eth",
                networkId: targetNetworkId,
              };
        const accountRef: AccountRef = {
          family: targetFamily,
          accountIndex: i,
          networkId: targetNetworkId,
        };
        try {
          const bal = await session.getBalance(accountRef, ref);
          return bal.amount;
        } catch {
          return null;
        }
      },
      enabled,
      refetchInterval: REFRESH_MS,
      staleTime: 5_000,
    })),
  });

  const accounts: AccountEntry[] = useMemo(
    () =>
      indexes.map((i) => ({
        index: i,
        address: addresses[i] ?? "",
        balance: balanceQueries[i]?.data ?? null,
        loading: balanceQueries[i]?.isLoading ?? true,
      })),
    [indexes, addresses, balanceQueries],
  );

  if (!isBip39 || !bip39Wallet || !effectiveId) return null;

  return {
    accounts,
    activeIndex: activeState.activeIndex,
    switchAccount: (index: number) => {
      // D15 — en 3.3, seul le wallet actif est déplié (D10·A). Garde
      // défensive pour Phase 4 : évite de muter `walletAccounts[activeId]`
      // en croyant cibler `effectiveId`.
      if (effectiveId !== activeId) {
        console.warn(
          `useAccounts.switchAccount: wallet "${effectiveId}" ≠ activeId "${activeId}" — ignoré`,
        );
        return;
      }
      setAccountIndex(index);
    },
    addAccount: () => {
      if (effectiveId !== activeId) {
        console.warn(
          `useAccounts.addAccount: wallet "${effectiveId}" ≠ activeId "${activeId}" — ignoré`,
        );
        return;
      }
      addAccountStore();
    },
  };
}

function deriveAddress(
  wallet: Bip39Wallet,
  family: ChainFamily,
  networkId: string,
  index: number,
): string {
  if (family === "bitcoin") {
    const network: BitcoinNetwork =
      networkId === "bitcoin-mainnet" ? "mainnet" : "testnet";
    return wallet.getBitcoinIdentity(network, 0, index).address;
  }
  return wallet.getIdentity(index).addressHex;
}
