import type { TxHistory } from "@sango/wallet-chains";
import { evmNetworkById } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useEvmRpcStore } from "@/stores/evm-rpc-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

const REFRESH_MS = 30_000;

/**
 * Historique EVM — **Phase 9.3** : accepte un `networkId` optionnel
 * pour agréger plusieurs réseaux en parallèle.
 *
 * - `useEvmHistory(20)` → réseau actif (comportement historique).
 * - `useEvmHistory(20, "bsc")` → historique du réseau BSC.
 *
 * **D9.3-a** — chaque réseau a sa propre `queryKey` (endpoint +
 * networkId), donc pas de collision de cache.
 *
 * Note React : l'appelant qui agrège N réseaux doit faire **N appels
 * explicites** (pas de `.map()` sur `useQuery` — règle des hooks).
 */
export function useEvmHistory(
  limit = 20,
  networkId?: string,
): UseQueryResult<TxHistory, Error> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const ctx = useNetworkQueryContext();
  // **Phase 12-A** — custom endpoint par networkId (query key).
  const evmCustomEndpoints = useEvmRpcStore((s) => s.customEndpoints);

  const effectiveNetworkId = networkId ?? ctx.networkId;
  // Construit un `AccountRef` indépendant du réseau actif si
  // `networkId` est fourni.
  const account = {
    family: "evm" as const,
    accountIndex: ctx.account.accountIndex,
    networkId: effectiveNetworkId,
  };

  // Endpoint contextuel — pour un networkId explicite, on prend le
  // premier endpoint par défaut du `Network`.
  const network = evmNetworkById(effectiveNetworkId);
  const endpoint =
    evmCustomEndpoints[effectiveNetworkId] ??
    network?.defaultRpcEndpoints[0] ??
    ctx.endpoint;

  const enabled =
    format === "bip39" && status === "unlocked" && Boolean(session);

  return useQuery<TxHistory, Error>({
    queryKey: networkQueryKey(
      ["evm-history"],
      endpoint,
      effectiveNetworkId,
      account.accountIndex,
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
