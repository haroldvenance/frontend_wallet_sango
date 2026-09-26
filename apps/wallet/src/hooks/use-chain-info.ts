import type { ChainInfo } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useSdkStore } from "@/stores/sdk-store";

export function useChainInfo(): UseQueryResult<ChainInfo, Error> {
  const { client } = useSdkStore();

  return useQuery<ChainInfo, Error>({
    queryKey: ["chain-info", client.network],
    queryFn: () => client.getChainInfo(),
    refetchInterval: 5_000,
  });
}
