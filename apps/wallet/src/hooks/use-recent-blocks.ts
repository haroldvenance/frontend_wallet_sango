import type { EvmBlock } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useIsSangoWallet } from "@/hooks/use-is-sango-wallet";
import { useSdkStore } from "@/stores/sdk-store";
import { useNetworkQueryContext } from "./use-network-query-context";

const POLL_MS = 3_000;

/**
 * Renvoie les N derniers blocs (rafraîchi toutes les 3 s).
 *
 * ⚠️ D-SESS-6 — Ce hook n'est PAS migré vers `WalletSession`.
 *
 *   `eth_getBlockByNumber` est propre au namespace EVM SANGO et n'a
 *   pas d'équivalent universel. La session V0 reste account-centric.
 *   Le SDK reste la source de vérité pour les blocs.
 *
 * Query key (D-UI-1) : ["recent-blocks", endpoint, networkId, count]
 */
export function useRecentBlocks(
  count = 5,
): UseQueryResult<EvmBlock[], Error> {
  const { client } = useSdkStore();
  const isSango = useIsSangoWallet();
  const { endpoint, networkId } = useNetworkQueryContext();

  return useQuery<EvmBlock[], Error>({
    queryKey: networkQueryKey(["recent-blocks"], endpoint, networkId, count),
    queryFn: () => client.getRecentBlocks(count),
    enabled: isSango,
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
  });
}
