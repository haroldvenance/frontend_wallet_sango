import type { EvmBlock } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useSdkStore } from "@/stores/sdk-store";

const POLL_MS = 3_000;

/** Renvoie les N derniers blocs (rafraîchi toutes les 3 s). */
export function useRecentBlocks(
  count = 5,
): UseQueryResult<EvmBlock[], Error> {
  const { client } = useSdkStore();
  return useQuery<EvmBlock[], Error>({
    queryKey: ["recent-blocks", count],
    queryFn: () => client.getRecentBlocks(count),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
  });
}
