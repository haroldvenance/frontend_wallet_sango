import type { Hex, Tx, TxPage } from "@sango/rpc";
import {
  useQuery,
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
