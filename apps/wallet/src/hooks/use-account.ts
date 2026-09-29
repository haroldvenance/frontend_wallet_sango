import type { Account } from "@sango/rpc";
import type { AddressHex, PublicKeyHex } from "@sango/types";
import type { AccountState } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { networkQueryKey } from "@/lib/network-query";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Récupère le compte (balance + nonce + pubkey) du wallet actif.
 *
 * Migré vers `WalletSession` (V0.1, stratégie B) : l'API publique est
 * **inchangée** — l'UI consomme toujours un `Account` (shape de
 * `@sango/rpc`). La conversion `AccountState → Account` est faite ici.
 *
 * Query key (D-UI-1) :
 *   ["account", endpoint, networkId, address]
 *
 * Refetch auto toutes les 5 s (config globale + refetchInterval local).
 */
export function useAccount(): UseQueryResult<Account | null, Error> {
  const session = useWalletSession();
  const { wallet, status } = useWalletStore();
  const { endpoint, networkId, account } = useNetworkQueryContext();

  const address = wallet?.identity.addressHex;

  return useQuery<Account | null, Error>({
    queryKey: networkQueryKey(["account"], endpoint, networkId, address),
    queryFn: async () => {
      if (!session) return null;
      const state = await session.getAccount(account);
      return state ? accountStateToRpc(state) : null;
    },
    enabled: status === "unlocked" && Boolean(session) && Boolean(address),
    refetchInterval: 5_000,
  });
}

/**
 * Convertit un `AccountState` (wallet-chains) en `Account` (RPC shape).
 *
 * Seul `balance` change de type : bigint → string décimale (le RPC
 * expose toujours les montants en string pour éviter les overflows JS).
 */
function accountStateToRpc(state: AccountState): Account {
  return {
    address: state.address as AddressHex,
    publicKey: state.publicKey as PublicKeyHex | null,
    balance: state.balance.toString(),
    nonce: state.nonce,
  };
}
