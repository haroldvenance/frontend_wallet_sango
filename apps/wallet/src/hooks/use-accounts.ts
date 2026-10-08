import { useMemo } from "react";

import { useQueries } from "@tanstack/react-query";
import { Bip39Wallet } from "@sango/wallet-core";
import type { BitcoinNetwork } from "@sango/wallet-core";
import type { AccountRef, AssetRef, ChainFamily } from "@sango/wallet-chains";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import {
  selectActiveAccountState,
  useWalletStore,
} from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Vue UI de la liste des comptes du wallet BIP-39 actif (Phase 2.3).
 *
 * **D-Phase2-3** — couche **UI** : elle orchestre plusieurs
 * `AccountRef` (un par index) et lit les balances en parallèle. Elle
 * ne crée pas de nouvelle API sur `WalletSession`.
 *
 * Les adresses sont **dérivées à la volée** :
 *   - EVM     → `wallet.getIdentity(index).addressHex`
 *   - Bitcoin → `wallet.getBitcoinIdentity(network, 0, index).address`
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

const REFRESH_MS = 15_000;

export function useAccounts(): UseAccountsResult | null {
  const session = useWalletSession();
  const wallet = useWalletStore((s) => s.wallet);
  const format = useWalletStore((s) => s.format);
  const activeId = useWalletStore((s) => s.activeId);
  const activeState = useWalletStore(selectActiveAccountState);
  const setAccountIndex = useWalletStore((s) => s.setAccountIndex);
  const addAccountStore = useWalletStore((s) => s.addAccount);

  const { endpoint, networkId, family } = useNetworkQueryContext();

  const isBip39 = format === "bip39";
  const bip39Wallet = wallet instanceof Bip39Wallet ? wallet : null;

  // Liste 0..highestIndex (borné par highestIndex, pas par solde).
  const indexes = useMemo(
    () =>
      Array.from({ length: activeState.highestIndex + 1 }, (_, i) => i),
    [activeState.highestIndex],
  );

  // Adresses dérivées à la volée.
  const addresses = useMemo(() => {
    if (!bip39Wallet) return [];
    return indexes.map((i) => deriveAddress(bip39Wallet, family, networkId, i));
  }, [bip39Wallet, family, networkId, indexes]);

  // Native assetId pour EVM (BSC → "bnb", sinon "eth").
  const nativeAssetId = useMemo(() => {
    if (family !== "evm") return null;
    if (networkId === "bsc" || networkId === "bsc-testnet") return "bnb";
    return "eth";
  }, [family, networkId]);

  const enabled = Boolean(session) && isBip39 && family !== "sango";

  const balanceQueries = useQueries({
    queries: indexes.map((i) => ({
      queryKey: networkQueryKey(
        ["multi-account-balance"],
        endpoint,
        networkId,
        i,
      ),
      queryFn: async (): Promise<bigint | null> => {
        if (!session) return null;
        const ref: AssetRef =
          family === "bitcoin"
            ? { kind: "native", assetId: "btc", networkId }
            : { kind: "native", assetId: nativeAssetId ?? "eth", networkId };
        const accountRef: AccountRef = {
          family,
          accountIndex: i,
          networkId,
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

  if (!isBip39 || !bip39Wallet || !activeId) return null;

  return {
    accounts,
    activeIndex: activeState.activeIndex,
    switchAccount: (index: number) => setAccountIndex(index),
    addAccount: () => addAccountStore(),
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
