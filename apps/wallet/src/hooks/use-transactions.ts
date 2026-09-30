import type { Hex, Tx, TxPage } from "@sango/rpc";
import type { TxDetail, TxDetailPage } from "@sango/wallet-chains";
import {
  useInfiniteQuery,
  useQuery,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Historique des transactions du wallet actif.
 *
 * **V0.3 (patch 3)** — Migration vers WalletSession (D-SESS-9 résolu).
 *
 * L'API publique est **inchangée** (mêmes signatures, mêmes types de
 * retour `Tx`/`TxPage` de `@sango/rpc`) — les composants
 * `history.tsx`, `history-detail.tsx` et `recent-activity.tsx` ne
 * bougent pas.
 *
 * Les adaptateurs `toTx` / `toTxPage` matérialisent la frontière
 * `TxDetail` (wallet-chains) → `Tx` (sango-rpc). Structurellement
 * identiques (post D-SESS-12), mais on écrit la conversion pour la
 * rendre explicite et détecter toute future divergence.
 *
 * ⚠️ Le mock `@sango/rpc/mocks` (isTxMockEnabled / MOCK_TXS) a été
 *    retiré : P3.2.c est livré, la session n'a pas de notion de mock.
 */

// --- Adaptateurs de frontière ----------------------------------------------

/**
 * `TxDetail` (wallet-chains, nouvelle abstraction) → `Tx` (sango-rpc,
 * API publique préservée pour les composants).
 *
 * Les deux types sont structurellement identiques — ce mapping est un
 * garde-fou : si `TxDetail` évolue, la conversion force une décision
 * explicite ici (mapping ou justification d'un `as`).
 */
function toTx(detail: TxDetail): Tx {
  return {
    hash: detail.hash as Hex,
    kind: detail.kind,
    blockHeight: detail.blockHeight,
    blockHash: detail.blockHash as Hex | null,
    txIndex: detail.txIndex,
    version: detail.version,
    chainId: detail.chainId as Hex,
    nonce: detail.nonce,
    sender: detail.sender as Hex,
    publicKey: detail.publicKey as Hex | null,
    gasLimit: detail.gasLimit,
    maxFee: detail.maxFee,
    priorityFee: detail.priorityFee,
    value: detail.value,
    txKind: detail.txKind,
    recipient: detail.recipient as Hex | null,
    data: detail.data as Hex,
    signature: detail.signature as Hex,
    success: detail.success,
    gasUsed: detail.gasUsed,
  };
}

function toTxPage(page: TxDetailPage): TxPage {
  return {
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    items: page.items.map(toTx),
  };
}

// --- Hook 1 : liste paginée (single page) ----------------------------------

export interface TransactionsFilter {
  limit?: number;
  offset?: number;
}

/**
 * Liste paginée des transactions du wallet actif (page unique).
 *
 * Utilisée par `recent-activity.tsx` (limit: 5).
 *
 * Query key (D-UI-1) :
 *   ["txs", endpoint, networkId, address, limit, offset]
 */
export function useTransactions(
  filter: TransactionsFilter = {},
): UseQueryResult<TxPage, Error> {
  const session = useWalletSession();
  const { wallet, status } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();
  const address = wallet?.identity.addressHex;
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;

  return useQuery<TxPage, Error>({
    queryKey: networkQueryKey(
      ["txs"],
      endpoint,
      networkId,
      address,
      limit,
      offset,
    ),
    queryFn: async () => {
      if (!session) return { total: 0, offset, limit, items: [] };
      const page = await session.getTransactionPage(account, limit, offset);
      return toTxPage(page);
    },
    enabled: status === "unlocked" && Boolean(session) && Boolean(address),
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 1,
  });
}

// --- Hook 2 : tx par hash --------------------------------------------------

/**
 * Récupère une tx par hash.
 *
 * Utilisée par `history-detail.tsx`.
 *
 * Query key (D-UI-1) : ["tx", endpoint, networkId, hash]
 */
export function useTransaction(
  hash: Hex | null,
): UseQueryResult<Tx | null, Error> {
  const session = useWalletSession();
  const { endpoint, networkId } = useNetworkQueryContext();

  return useQuery<Tx | null, Error>({
    queryKey: networkQueryKey(["tx"], endpoint, networkId, hash),
    queryFn: async () => {
      if (!session || !hash) return null;
      const detail = await session.getTransactionByHash(networkId, hash);
      return detail ? toTx(detail) : null;
    },
    enabled: Boolean(session) && Boolean(hash),
    staleTime: 30_000,
    retry: 1,
  });
}

// --- Hook 3 : pagination infinie (page /history) --------------------------

/**
 * Version paginée via `useInfiniteQuery`.
 *
 * Utilisée par `/history` pour le bouton « Charger plus ».
 *
 * Query key (D-UI-1) :
 *   ["txs-infinite", endpoint, networkId, address, limit]
 */
export function useInfiniteTransactions(
  limit = 20,
): UseInfiniteQueryResult<{ pages: TxPage[]; pageParams: number[] }, Error> {
  const session = useWalletSession();
  const { wallet, status } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();
  const address = wallet?.identity.addressHex;

  return useInfiniteQuery<
    TxPage,
    Error,
    { pages: TxPage[]; pageParams: number[] },
    readonly unknown[],
    number
  >({
    queryKey: networkQueryKey(
      ["txs-infinite"],
      endpoint,
      networkId,
      address,
      limit,
    ),
    enabled: status === "unlocked" && Boolean(session) && Boolean(address),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!session) return { total: 0, offset: 0, limit, items: [] };
      const page = await session.getTransactionPage(
        account,
        limit,
        pageParam as number,
      );
      return toTxPage(page);
    },
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
