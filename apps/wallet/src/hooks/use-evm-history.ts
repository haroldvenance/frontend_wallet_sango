import type { TxHistory } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

const REFRESH_MS = 30_000;

/**
 * Historique EVM du wallet actif (D-INDEXER-3).
 *
 * Refresh : 30 s. Le `useSendEvm` déclenche en plus une invalidation
 * immédiate après un envoi (pas besoin d'attendre 30 s).
 *
 * Le composant peut appeler `refetch()` pour un refresh manuel.
 */
export function useEvmHistory(limit = 20): UseQueryResult<TxHistory, Error> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();

  const enabled =
    format === "bip39" && status === "unlocked" && Boolean(session);

  return useQuery<TxHistory, Error>({
    // D-Phase2-4 : `accountIndex` explicite — historique par compte.
    // (`account.networkId` reste en extra, héritage E1.5.)
    queryKey: networkQueryKey(
      ["evm-history"],
      endpoint,
      networkId,
      account.accountIndex,
      account.networkId,
    ),
    queryFn: async () => {
      if (!session) return { total: 0, items: [] };
      return session.getHistory(account, undefined, limit);
    },
    enabled,
    refetchInterval: REFRESH_MS,
    staleTime: 10_000,
    retry: 1,
  });
}
