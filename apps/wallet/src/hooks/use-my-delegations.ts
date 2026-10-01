import type { Delegation, PendingUnbonding } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useSangoWallet } from "@/hooks/use-sango-wallet";
import { useNetworkQueryContext } from "./use-network-query-context";

const POLL_MS = 5_000;

/**
 * Délégations du wallet courant.
 *
 * **V0.2 (patch 5)** — Migration vers WalletSession.
 *   `client.getMyDelegations()` → `session.getDelegations(account)`.
 *   La session dérive l'adresse depuis l'`AccountRef` (même résultat).
 *
 * Query key (D-UI-1) : ["my-delegations", endpoint, networkId, address]
 */
export function useMyDelegations(): UseQueryResult<
  readonly Delegation[],
  Error
> {
  const session = useWalletSession();
  const wallet = useSangoWallet();
  const { status } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();

  const address = wallet?.identity.addressHex;

  return useQuery<readonly Delegation[], Error>({
    queryKey: networkQueryKey(
      ["my-delegations"],
      endpoint,
      networkId,
      address,
    ),
    queryFn: async () => {
      if (!session) return [];
      return session.getDelegations(account);
    },
    enabled: status === "unlocked" && Boolean(session) && Boolean(address),
    refetchInterval: POLL_MS,
  });
}

/**
 * Unbondings en attente de maturation du wallet courant.
 *
 * Query key (D-UI-1) : ["my-pending-unbondings", endpoint, networkId, address]
 */
export function useMyPendingUnbondings(): UseQueryResult<
  readonly PendingUnbonding[],
  Error
> {
  const session = useWalletSession();
  const wallet = useSangoWallet();
  const { status } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();

  const address = wallet?.identity.addressHex;

  return useQuery<readonly PendingUnbonding[], Error>({
    queryKey: networkQueryKey(
      ["my-pending-unbondings"],
      endpoint,
      networkId,
      address,
    ),
    queryFn: async () => {
      if (!session) return [];
      return session.getPendingUnbondings(account);
    },
    enabled: status === "unlocked" && Boolean(session) && Boolean(address),
    refetchInterval: POLL_MS,
  });
}
