import type { Account } from "@sango/rpc";
import type { AddressHex } from "@sango/types";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Récupère le compte (balance + nonce + pubkey) du wallet actif.
 *
 * - `enabled` seulement si le wallet est unlocked.
 * - refetch auto toutes les 5 s (config globale).
 */
export function useAccount(): UseQueryResult<Account | null, Error> {
  const { client, endpoint } = useSdkStore();
  const { wallet, status } = useWalletStore();

  const address = wallet?.identity.addressHex as AddressHex | undefined;

  return useQuery<Account | null, Error>({
    // `endpoint` dans la clé : refetch automatique au changement de réseau.
    queryKey: ["account", endpoint, address],
    queryFn: () => client.rpc.getAccount(address!),
    enabled: status === "unlocked" && Boolean(address),
    refetchInterval: 5_000,
  });
}
