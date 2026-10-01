import { useMemo } from "react";

import type { AccountRef, ChainFamily } from "@sango/wallet-chains";
import type { WalletFormat } from "@sango/wallet-core";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Contexte de réseau pour les queries React Query.
 *
 * **Source de vérité** (D-SIGNER-1) :
 *
 *     wallet-store.format  →  family  →  networkId  →  AccountRef
 *
 *   - `format === "sango-legacy"`  →  `family: "sango"` + `networkId: "sango-devnet"`
 *   - `format === "bip39"`         →  `family: "evm"`   + `networkId: "ethereum-sepolia"`
 *
 * **Aucun `resolveSangoNetworkId()` n'est appliqué à un wallet BIP-39.**
 * Le `networkId` est lu directement depuis le store, il a été figé au
 * moment de l'unlock (route `/create-evm`, `/import-evm`, `unlock.tsx`).
 *
 * `endpoint` reste le RPC SANGO (sdk-store) — il n'est utilisé que par
 * les hooks SANGO-spécifiques (`use-chain-info`, etc.).
 */
export interface NetworkQueryContext {
  readonly endpoint: string;
  readonly networkId: string;
  readonly family: ChainFamily;
  readonly account: AccountRef;
}

export function useNetworkQueryContext(): NetworkQueryContext {
  const endpoint = useSdkStore((s) => s.endpoint);
  const format = useWalletStore((s) => s.format);
  const networkId = useWalletStore((s) => s.networkId);

  return useMemo(() => {
    const family = familyFromFormat(format);
    return {
      endpoint,
      networkId,
      family,
      account: {
        family,
        accountIndex: 0,
        networkId,
      },
    };
  }, [endpoint, format, networkId]);
}

/**
 * Dérive la famille wallet-chains depuis le format wallet-core.
 *
 * `null` (aucun wallet) → `"sango"` par défaut. Les hooks protégés par
 * `status === "unlocked"` ne s'exécutent de toute façon pas avant le
 * déverrouillage.
 */
function familyFromFormat(format: WalletFormat | null): ChainFamily {
  if (format === "bip39") return "evm";
  return "sango";
}
