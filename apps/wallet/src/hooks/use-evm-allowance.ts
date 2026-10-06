import type { Address, Token } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { isValidEvmAddress } from "@/lib/eth";
import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Allowance ERC-20 d'un (token, spender) pour le wallet EVM courant —
 * E2.2.a.3.
 *
 * **Owner implicite** : dérivé de l'`AccountRef` par `WalletSession`
 * (on ne peut pas lire l'allowance d'un autre compte via ce hook).
 *
 * `enabled` n'est vrai que lorsque les 4 conditions sont réunies :
 *   - wallet BIP-39 déverrouillé
 *   - session disponible
 *   - `token` fourni
 *   - `spender` est une adresse EVM **valide** (format 0x + 40 hex).
 *     La validation `isValidEvmAddress` évite d'envoyer au RPC une
 *     saisie partielle ("0x12") qui produirait un revert silencieux.
 *
 * La clé de cache suit la convention `networkQueryKey` :
 *   `["allowance", endpoint, networkId, token.contract, spender]`
 * ce qui permet à `useApproveEvm` d'invalider sur le préfixe
 * `["allowance"]` après succès.
 */

export interface AllowanceResult {
  readonly token: Token;
  readonly spender: Address;
  readonly amount: bigint;
}

export function useEvmAllowance(
  token: Token | null,
  spender: Address | null,
): UseQueryResult<AllowanceResult | null, Error> {
  const session = useWalletSession();
  const { status, format } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();

  const enabled =
    format === "bip39" &&
    status === "unlocked" &&
    Boolean(session) &&
    token !== null &&
    spender !== null &&
    isValidEvmAddress(spender);

  return useQuery<AllowanceResult | null, Error>({
    queryKey: networkQueryKey(
      ["allowance"],
      endpoint,
      networkId,
      token?.contract ?? "",
      spender ?? "",
    ),
    queryFn: async () => {
      if (!session || !token || !spender) return null;
      const amount = await session.getAllowance(account, spender, token);
      return { token, spender, amount };
    },
    enabled,
    staleTime: 10_000,
    retry: 1,
  });
}
