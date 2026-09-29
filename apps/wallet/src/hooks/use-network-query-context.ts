import { useMemo } from "react";

import type { AccountRef } from "@sango/wallet-chains";

import { resolveSangoNetworkId } from "@/lib/network";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Contexte de réseau pour les queries React Query.
 *
 * Fournit les 3 valeurs nécessaires à toute query dépendant du réseau :
 *   - `endpoint`   : dimension « backend concret »
 *   - `networkId`  : dimension « identité métier du réseau »
 *   - `account`    : `AccountRef` prêt à l'emploi (accountIndex = 0 en V0)
 *
 * Centralise la résolution pour éviter qu'un hook oublie l'une des
 * dimensions d'invalidation (D-UI-1).
 */
export interface NetworkQueryContext {
  readonly endpoint: string;
  readonly networkId: string;
  readonly account: AccountRef;
}

export function useNetworkQueryContext(): NetworkQueryContext {
  const endpoint = useSdkStore((s) => s.endpoint);
  const network = useWalletStore((s) => s.network);
  const networkId = resolveSangoNetworkId(network);

  return useMemo(
    () => ({
      endpoint,
      networkId,
      account: {
        family: "sango" as const,
        accountIndex: 0,
        networkId,
      },
    }),
    [endpoint, networkId],
  );
}
