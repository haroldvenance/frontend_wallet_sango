import type { Delegation, PendingUnbonding } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

const POLL_MS = 5_000;

/** Délégations du wallet courant. */
export function useMyDelegations(): UseQueryResult<Delegation[], Error> {
  const { client } = useSdkStore();
  const { wallet, status } = useWalletStore();
  return useQuery<Delegation[], Error>({
    queryKey: ["my-delegations", wallet?.identity.addressHex],
    queryFn: () => client.getMyDelegations(),
    enabled: status === "unlocked" && !!wallet,
    refetchInterval: POLL_MS,
  });
}

/** Unbondings en attente de maturation du wallet courant. */
export function useMyPendingUnbondings(): UseQueryResult<PendingUnbonding[], Error> {
  const { client } = useSdkStore();
  const { wallet, status } = useWalletStore();
  return useQuery<PendingUnbonding[], Error>({
    queryKey: ["my-pending-unbondings", wallet?.identity.addressHex],
    queryFn: () => client.getMyPendingUnbondings(),
    enabled: status === "unlocked" && !!wallet,
    refetchInterval: POLL_MS,
  });
}
