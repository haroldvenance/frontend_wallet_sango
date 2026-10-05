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
 * `endpoint` reste le RPC SANGO (sdk-store) — il n'est utilisé que par
 * les hooks SANGO-spécifiques (`use-chain-info`, etc.).
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
  const endpoint = useSdkStore((s) => s.endpoint);
  const format = useWalletStore((s) => s.format);
  const networkId = useWalletStore((s) => s.networkId);

  return useMemo(() => {
    const family = familyFromFormat(format);
    const nativeAsset = resolveNativeAsset(family, networkId);
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
  }, [endpoint, format, networkId]);
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
