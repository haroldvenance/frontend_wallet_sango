import type { Token } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Un token avec son solde pour l'adresse EVM courante.
 *
 * `balance` est en base units du token (voir `token.metadata.decimals`
 * pour l'affichage). `balance === null` signifie que la lecture a
 * échoué pour ce token (réseau intermittent, contrat non déployé) —
 * l'UI affiche "—" dans ce cas.
 */
export interface TokenWithBalance {
  readonly token: Token;
  readonly balance: bigint | null;
}

const REFRESH_MS = 15_000;

/**
 * Liste les tokens ERC-20 configurés pour le réseau EVM courant,
 * avec leur solde pour le wallet actif (E1.6.a.5).
 *
 * Un seul appel RPC par token (`eth_call balanceOf`), exécuté en
 * parallèle. Échec individuel silencieux (balance = null) pour ne pas
 * faire planter la liste si un seul token échoue.
 *
 * Le réseau vient de `wallet-store.networkId` — le hook n'est actif
 * que si le wallet est BIP-39.
 */
export function useEvmTokens(): UseQueryResult<
  readonly TokenWithBalance[],
  Error
> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();

  const enabled = format === "bip39" && status === "unlocked" && Boolean(session);

  return useQuery<readonly TokenWithBalance[], Error>({
    // D-Phase2-4 : `accountIndex` explicite dans la query key — les
    // soldes de Compte 1 et Compte 2 ne partagent pas de cache.
    queryKey: networkQueryKey(
      ["evm-tokens"],
      endpoint,
      networkId,
      account.accountIndex,
    ),
    queryFn: async () => {
      if (!session) return [];
      const tokens = await session.listTokens(networkId);

      // Lecture des soldes en parallèle. Chaque échec individuel
      // produit `balance: null` au lieu de faire échouer toute la liste.
      const results = await Promise.all(
        tokens.map(async (token) => {
          try {
            const balance = await session.getTokenBalance(account, token);
            return { token, balance } as const;
          } catch {
            return { token, balance: null } as const;
          }
        }),
      );
      return results;
    },
    enabled,
    refetchInterval: REFRESH_MS,
    staleTime: 5_000,
    retry: 1,
  });
}
