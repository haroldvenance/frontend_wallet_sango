import type { FeeRates } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

const REFRESH_MS = 60_000;

/**
 * Taux de frais recommandés pour le réseau courant — E2.1.b.6.3.
 *
 * `session.getFeeRates(networkId)` retourne `null` si la famille ne
 * supporte pas la capacité (cas EVM aujourd'hui). Le hook est donc
 * `enabled` uniquement pour Bitcoin.
 *
 * Refresh 60 s — les taux Esplora évoluent lentement (bloc ~10 min).
 */
export function useBitcoinFeeRates(): UseQueryResult<FeeRates | null, Error> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const { endpoint, networkId, family } = useNetworkQueryContext();

  const enabled =
    format === "bip39" &&
    status === "unlocked" &&
    Boolean(session) &&
    family === "bitcoin";

  return useQuery<FeeRates | null, Error>({
    queryKey: networkQueryKey(["bitcoin-fee-rates"], endpoint, networkId),
    queryFn: async () => {
      if (!session) return null;
      return session.getFeeRates(networkId);
    },
    enabled,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
    retry: 1,
  });
}
