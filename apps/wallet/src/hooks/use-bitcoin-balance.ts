import type { Balance } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

const REFRESH_MS = 15_000;

/**
 * Solde BTC natif du wallet courant — E2.1.b.6.2.
 *
 * **D-E2.1-9** — lecture via `session.getBalance()` avec un `assetRef`
 * natif `{ kind: "native", assetId: "btc", networkId }`. Pas
 * d'`accountProvider` Bitcoin : le solde vient de la somme des UTXOs
 * côté adapter (`BitcoinBalanceProvider`).
 *
 * `enabled` seulement si :
 *   - wallet BIP-39 déverrouillé ;
 *   - session disponible ;
 *   - `account.family === "bitcoin"` (cohérence D-E2.1-18).
 */
export function useBitcoinBalance(): UseQueryResult<Balance | null, Error> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const { endpoint, networkId, account, family } = useNetworkQueryContext();

  const enabled =
    format === "bip39" &&
    status === "unlocked" &&
    Boolean(session) &&
    family === "bitcoin";

  return useQuery<Balance | null, Error>({
    queryKey: networkQueryKey(["bitcoin-balance"], endpoint, networkId),
    queryFn: async () => {
      if (!session) return null;
      return session.getBalance(account, {
        kind: "native",
        assetId: "btc",
        networkId,
      });
    },
    enabled,
    refetchInterval: REFRESH_MS,
    staleTime: 5_000,
  });
}
