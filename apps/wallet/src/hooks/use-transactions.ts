/**
 * ⚠️ D-SESS-9 — Ce hook reste sur le SDK en V0.
 *
 *   La `WalletSession` V0 est **account-centric** (D-SESS-6) et son
 *   `HistoryItem` est une vue **générique** (txHash, from, to, amount,
 *   status). Le UI de `/history` a besoin de champs SANGO-spécifiques
 *   que `HistoryItem` n'expose pas :
 *
 *     - `txKind` (icône, label, filtre staking)
 *     - `nonce`
 *     - pagination `offset` (useInfiniteTransactions)
 *
 *   Et `/history/:hash` est un **transaction viewer** (comme
 *   Etherscan) : il expose gasLimit, maxFee, priorityFee, signature,
 *   data, blockHash, txIndex — des champs d'exploration, pas de
 *   sémantique wallet.
 *
 *   Migrer exigerait :
 *     1. d'ajouter `kind` à `HistoryItem` (pollue l'abstraction) ;
 *     2. d'ajouter `offset` à `session.getHistory()` ;
 *     3. un nouveau `TransactionDetailProvider` (sur-ingénierie pour
 *        un seul réseau sans 2ᵉ cas d'usage).
 *
 *   V0.2 : à reprendre quand EVM fournira un 2ᵉ cas d'usage réel.
 */

import type { Hex, Tx, TxPage } from "@sango/rpc";
import {
  useInfiniteQuery,
  useQuery,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { MOCK_TXS, isTxMockEnabled } from "@sango/rpc/mocks";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

export interface TransactionsFilter {
  limit?: number;
  offset?: number;
}

/**
 * Liste paginée des transactions du wallet actif.
 *
 * Tant que `sango_getTransactionsByAddress` (P3.2.c) n'est pas livré,
 * utilise des mocks si `VITE_SANGO_TX_MOCK=true`. Sinon, l'appel échoue
 * avec MethodNotFound (le hook renvoie `isError: true`).
 */
export function useTransactions(
  filter: TransactionsFilter = {},
): UseQueryResult<TxPage, Error> {
  const { client, endpoint } = useSdkStore();
  const { wallet, status } = useWalletStore();
  const address = wallet?.identity.addressHex as Hex | undefined;
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;

  return useQuery<TxPage, Error>({
    queryKey: ["txs", endpoint, address, limit, offset],
    queryFn: async () => {
      if (isTxMockEnabled()) {
        return {
          total: MOCK_TXS.length,
          offset,
          limit,
          items: [...MOCK_TXS],
        };
      }
      return client.rpc.getTransactionsByAddress(address!, limit, offset);
    },
    enabled: status === "unlocked" && Boolean(address),
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 1,
  });
}

/**
 * Récupère une tx par hash (via RPC, déjà livré en V1).
 *
 * Utile pour afficher un statut de tx après un envoi.
 */
export function useTransaction(
  hash: Hex | null,
): UseQueryResult<Tx | null, Error> {
  const { client } = useSdkStore();

  return useQuery<Tx | null, Error>({
    queryKey: ["tx", hash],
    queryFn: () => client.rpc.getTransactionByHash(hash!),
    enabled: Boolean(hash),
    staleTime: 30_000,
    retry: 1,
  });
}

// --- Variante infinie (page /history) --------------------------------------

/**
 * Version paginée via `useInfiniteQuery`.
 *
 * Utilisée par `/history` pour le bouton « Charger plus ».
 * Coexiste avec `useTransactions` (single page) qui reste utilisé par
 * `RecentActivity`.
 */
export function useInfiniteTransactions(
  limit = 20,
): UseInfiniteQueryResult<{ pages: TxPage[]; pageParams: number[] }, Error> {
  const { client, endpoint } = useSdkStore();
  const { wallet, status } = useWalletStore();
  const address = wallet?.identity.addressHex as Hex | undefined;

  return useInfiniteQuery<TxPage, Error, { pages: TxPage[]; pageParams: number[] }, readonly unknown[], number>({
    queryKey: ["txs-infinite", endpoint, address, limit],
    enabled: status === "unlocked" && Boolean(address),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      client.rpc.getTransactionsByAddress(address!, limit, pageParam as number),
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + lastPage.limit;
      return next < lastPage.total ? next : undefined;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

/** Aplatit toutes les pages en une seule liste. */
export function flattenTxPages(
  data: { pages: TxPage[] } | undefined,
): Tx[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.items);
}
