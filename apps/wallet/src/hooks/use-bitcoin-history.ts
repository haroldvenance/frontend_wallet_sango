import type { TxHistory } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

const REFRESH_MS = 60_000;

/**
 * Historique Bitcoin du wallet actif — Patch A.2.
 *
 * **D11·A** — refresh 60 s (Bitcoin confirme en ~10 min, poller plus
 * vite gaspille du RPC pour rien).
 *
 * **D2·A** — 20 dernières transactions (tronqué par le provider).
 *
 * Le chemin complet :
 *   session.getHistory(account, { kind: "native", assetId: "btc", networkId }, 20)
 *       ↓
 *   adapter.addressProvider.deriveAddress(account)  ← Patch A.1
 *       ↓
 *   adapter.historyProvider.getHistory({ address, limit })  ← Patch A.2
 *       ↓
 *   MempoolSpaceRpc.getTxs(address)
 */
export function useBitcoinHistory(
  limit = 20,
): UseQueryResult<TxHistory, Error> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const { endpoint, networkId, account, family } = useNetworkQueryContext();

  const enabled =
    format === "bip39" &&
    status === "unlocked" &&
    Boolean(session) &&
    family === "bitcoin";

  return useQuery<TxHistory, Error>({
    queryKey: networkQueryKey(
      ["bitcoin-history"],
      endpoint,
      networkId,
      account.accountIndex,
    ),
    queryFn: async () => {
      if (!session) return { total: 0, items: [] };
      return session.getHistory(
        account,
        { kind: "native", assetId: "btc", networkId },
        limit,
      );
    },
    enabled,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
    retry: 1,
  });
}
