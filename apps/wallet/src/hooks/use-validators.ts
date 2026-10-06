import type { AddressHex } from "@sango/types";
import type { ValidatorInfo } from "@sango/rpc";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useIsSangoWallet } from "@/hooks/use-is-sango-wallet";
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
  const isSango = useIsSangoWallet();
  const { endpoint, networkId } = useNetworkQueryContext();

  return useQuery<ValidatorInfo[], Error>({
    queryKey: networkQueryKey(["validators"], endpoint, networkId),
    queryFn: async () => {
      if (!session) return [];
      // `session.listValidators` retourne `wallet-chains.ValidatorInfo[]` ;
      // spread pour satisfaire la signature mutable attendue par les
      // composants (ValidatorActionsPanel, validators.tsx).
      //
      // ⚠️ E2.1.b.3 — le widening d'`Address` (D-E2.1-14) ajoute
      // `bc1…` / `tb1…` à l'union, ce qui rend `wallet-chains.ValidatorInfo`
      // structurellement incompatible avec `sango-rpc.ValidatorInfo`
      // (dont `address: \`0x${string}\``). Au runtime, un validateur
      // ne peut pas être Bitcoin (le concept n'existe que sur SANGO) —
      // le cast est un artefact multi-chaîne local.
      return [
        ...(await session.listValidators(networkId)),
      ] as unknown as ValidatorInfo[];
    },
    enabled: isSango && Boolean(session),
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

  const isSango = useIsSangoWallet();
  return useQuery<ValidatorInfo | null, Error>({
    queryKey: networkQueryKey(["validator"], endpoint, networkId, address),
    queryFn: async () => {
      if (!session || !address) return null;
      // Voir useValidators : cast à la frontière pour le widening
      // d'`Address` (E2.1.b.3).
      return session.getValidatorInfo(
        networkId,
        address,
      ) as unknown as ValidatorInfo | null;
    },
    enabled: isSango && Boolean(session) && Boolean(address),
    refetchInterval: POLL_MS,
  });
}
