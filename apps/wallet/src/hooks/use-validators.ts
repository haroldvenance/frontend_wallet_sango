import type { AddressHex } from "@sango/types";
import type { ValidatorInfo } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useNetworkQueryContext } from "./use-network-query-context";

const POLL_MS = 5_000;

/**
 * Liste complète des validateurs, rafraîchie toutes les 5 s.
 *
 * **V0.2 (patch 5)** — Migration vers WalletSession.
 *   `client.getValidators()` → `session.listValidators(networkId)`.
 *
 * ⚠️ Le type public reste `@sango/rpc.ValidatorInfo` (utilisé par
 *    les composants `ValidatorActionsPanel`, `validator-detail.tsx`).
 *    La session retourne `wallet-chains.ValidatorInfo` qui est
 *    structurellement identique — seul le branding `AddressHex`
 *    diffère. On caste à la frontière du hook pour préserver l'API
 *    publique (stratégie B).
 *
 * Query key (D-UI-1) : ["validators", endpoint, networkId]
 */
export function useValidators(): UseQueryResult<ValidatorInfo[], Error> {
  const session = useWalletSession();
  const { endpoint, networkId } = useNetworkQueryContext();

  return useQuery<ValidatorInfo[], Error>({
    queryKey: networkQueryKey(["validators"], endpoint, networkId),
    queryFn: async () => {
      if (!session) return [];
      const result = await session.listValidators(networkId);
      return result as ValidatorInfo[];
    },
    enabled: Boolean(session),
    refetchInterval: POLL_MS,
  });
}

/**
 * Infos d'un validateur précis, rafraîchies toutes les 5 s.
 *
 * Voir `useValidators` pour la note sur le cast à la frontière.
 *
 * Query key (D-UI-1) : ["validator", endpoint, networkId, address]
 */
export function useValidatorInfo(
  address: AddressHex | undefined,
): UseQueryResult<ValidatorInfo | null, Error> {
  const session = useWalletSession();
  const { endpoint, networkId } = useNetworkQueryContext();

  return useQuery<ValidatorInfo | null, Error>({
    queryKey: networkQueryKey(["validator"], endpoint, networkId, address),
    queryFn: async () => {
      if (!session || !address) return null;
      const result = await session.getValidatorInfo(networkId, address);
      return result as ValidatorInfo | null;
    },
    enabled: Boolean(session) && Boolean(address),
    refetchInterval: POLL_MS,
  });
}
