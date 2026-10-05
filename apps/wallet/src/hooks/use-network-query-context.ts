import { useMemo } from "react";

import { evmNetworkById } from "@sango/wallet-chains";
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
 * `endpoint` est **contextuel à la famille** (D-E1.7-10) :
 *   - family === "sango" → RPC SANGO (sdk-store)
 *   - family === "evm"   → premier endpoint du Network EVM courant
 *                          (via `defaultRpcEndpoints[0]`)
 *
 * **D-E1.7-10** : l'ancien comportement (endpoint SANGO injecté dans
 * les query keys EVM) faisait qu'un changement d'endpoint SANGO
 * invalidait des queries EVM sans raison. Correction : chaque famille
 * porte son endpoint naturel dans la query key.
 */
export interface NetworkQueryContext {
  readonly endpoint: string;
  readonly networkId: string;
  readonly family: ChainFamily;
  readonly account: AccountRef;
  /**
   * Asset natif du réseau courant, ou `null` si non résolu.
   *
   * Source de vérité pour l'`assetId` des transactions natives (send,
   * fee). Remplace l'ancienne constante globale hardcodée "eth".
   *
   * - SANGO   → "sango"
   * - EVM     → `network.nativeAsset` ("eth", "bnb", …)
   * - inconnu → `null` (état métier explicite, pas de fallback)
   *
   * **D-E1.7-1** : pas de fallback `?? "eth"`. Un réseau inconnu
   * DOIT être traité comme un état invalide par l'appelant.
   */
  readonly nativeAsset: string | null;
}

export function useNetworkQueryContext(): NetworkQueryContext {
  const sangoEndpoint = useSdkStore((s) => s.endpoint);
  const format = useWalletStore((s) => s.format);
  const networkId = useWalletStore((s) => s.networkId);

  return useMemo(() => {
    const family = familyFromFormat(format);
    const nativeAsset = resolveNativeAsset(family, networkId);
    const endpoint = resolveEndpoint(family, sangoEndpoint, networkId);
    return {
      endpoint,
      networkId,
      family,
      nativeAsset,
      account: {
        family,
        accountIndex: 0,
        networkId,
      },
    };
  }, [sangoEndpoint, format, networkId]);
}

/**
 * Résout l'endpoint pertinent pour le contexte réseau courant.
 *
 * **D-E1.7-10** :
 *   - SANGO → `sdk-store.endpoint` (injectable par l'utilisateur)
 *   - EVM   → premier endpoint par défaut du Network EVM
 *             (fallback `""` si le networkId est inconnu)
 *
 * Retourne `""` (chaîne vide) si aucune résolution n'est possible —
 * c'est un état neutre pour la query key. Aucun endpoint "inventé".
 */
function resolveEndpoint(
  family: ChainFamily,
  sangoEndpoint: string,
  networkId: string,
): string {
  if (family === "sango") return sangoEndpoint;
  const network = evmNetworkById(networkId);
  return network?.defaultRpcEndpoints[0] ?? "";
}

/**
 * Résout l'asset natif du réseau courant.
 *
 * **D-E1.7-1** : pas de fallback `?? "eth"`. Un réseau EVM inconnu
 * retourne `null` — l'appelant DOIT gérer cet état (guard).
 */
function resolveNativeAsset(
  family: ChainFamily,
  networkId: string,
): string | null {
  if (family === "sango") return "sango";
  const network = evmNetworkById(networkId);
  return network?.nativeAsset ?? null;
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
