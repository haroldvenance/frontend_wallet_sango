import type { ChainInfo } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useSdkStore } from "@/stores/sdk-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Informations de chaîne (chainId, height, validatorCount,
 * protocolVersion).
 *
 * ⚠️ D-SESS-6 — Ce hook n'est PAS migré vers `WalletSession`.
 *
 *   `ChainInfo` (validatorCount, protocolVersion) est spécifique à
 *   SANGO et n'a pas d'équivalent universel multi-chaîne. La session
 *   V0 reste **account-centric** (balance, send, history) et ne
 *   l'absorbe pas. Le SDK reste la source de vérité pour les
 *   métadonnées réseau.
 *
 *   Migration envisagée en V0.2+ si un besoin multi-chaîne apparaît
 *   (probablement sous forme de `NetworkInfo` par famille).
 *
 * Query key (D-UI-1) : ["chain-info", endpoint, networkId]
 */
export function useChainInfo(): UseQueryResult<ChainInfo, Error> {
  const { client } = useSdkStore();
  const { endpoint, networkId } = useNetworkQueryContext();

  return useQuery<ChainInfo, Error>({
    queryKey: networkQueryKey(["chain-info"], endpoint, networkId),
    queryFn: () => client.getChainInfo(),
    refetchInterval: 5_000,
  });
}
