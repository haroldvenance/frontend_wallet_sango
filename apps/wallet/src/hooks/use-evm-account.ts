import type { AccountState } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * État du compte EVM du wallet actif.
 *
 * Symétrique de `useAccount` (SANGO), mais retourne `AccountState`
 * (balance bigint en wei, publicKey toujours null côté EVM).
 *
 * L'API publique est différente de `useAccount` : on ne force pas une
 * fausse compat — `publicKey` EVM n'existe pas côté RPC, `balance` est
 * un bigint (pas une string décimale).
 */
export function useEvmAccount(): UseQueryResult<AccountState | null, Error> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();

  const enabled = format === "bip39" && status === "unlocked" && Boolean(session);

  return useQuery<AccountState | null, Error>({
    // D-Phase2-4 : `accountIndex` explicite dans la query key — un
    // switch de compte produit une nouvelle clé, isolant les données.
    queryKey: networkQueryKey(
      ["evm-account"],
      endpoint,
      networkId,
      account.accountIndex,
    ),
    queryFn: async () => {
      if (!session) return null;
      return session.getAccount(account);
    },
    enabled,
    refetchInterval: 10_000,
  });
}
