import { useMemo } from "react";

import { useQueries } from "@tanstack/react-query";
import { resolveChainFamily } from "@/lib/chain-family";

import {
  fetchWalletAssetsWith,
  type UnifiedAsset,
  type WalletPlan,
} from "@/hooks/use-unified-assets";
import { useWalletSession } from "@/providers/wallet-session-context";
import {
  selectActiveAccountIndex,
  useWalletStore,
} from "@/stores/wallet-store";

/**
 * Agrégation de **tous les actifs du wallet actif**, toutes chaînes
 * confondues — Phase 8 (D8-c·A).
 *
 * **Différence avec `useUnifiedAssets`** :
 *   - `useUnifiedAssets` → autres wallets (Phase 4, cross-wallet).
 *   - `useAllWalletAssets` → wallet actif (Phase 8, cross-chain).
 *
 * **Périmètre** :
 *   - V2 (Bip39Wallet) → SANGO + Bitcoin + EVM (natif + tokens).
 *   - V1 (sango-legacy) → SANGO uniquement.
 *
 * **Invariant D8-c** — toutes les requêtes passent par la **session
 * active**. `buildWalletSession` enregistre SANGO_DEVNET, tous les
 * EVM et les deux Bitcoin dans le registry → la session peut lire
 * n'importe laquelle de ces chaînes sans changer le wallet actif ni
 * déclencher de signature.
 *
 * Le `networkId` EVM utilisé est le réseau actif courant s'il est
 * EVM, sinon `ethereum-mainnet` par défaut.
 */

export type WalletAsset = UnifiedAsset;

/**
 * Retourne l'identifiant "affichable" d'un actif (`eth`, `btc`,
 * `sango`, `usdc`…) indépendamment du variant de `AssetRef`.
 *
 *   - `kind === "native"` → `assetRef.assetId` (`"eth"`, `"btc"`…)
 *   - `kind === "token"`  → `symbol.toLowerCase()` (`"usdc"`, `"usdt"`)
 *
 * Raison : `AssetRef` est une union discriminée et le variant
 * `token` n'a pas de champ `assetId`. Les composants UI ne doivent
 * pas connaître cette subtilité — ils passent par ce helper.
 */
export function getDisplayAssetId(asset: UnifiedAsset): string {
  if (asset.assetRef.kind === "native") return asset.assetRef.assetId;
  return asset.symbol.toLowerCase();
}

export interface UseAllWalletAssetsResult {
  readonly assets: readonly WalletAsset[];
  readonly loading: boolean;
}

// Réseaux par défaut par famille (D8-c·A).
const SANGO_NETWORK_ID = "sango-devnet";
const BITCOIN_NETWORK_ID = "bitcoin-mainnet";
const DEFAULT_EVM_NETWORK_ID = "ethereum-mainnet";

export function useAllWalletAssets(): UseAllWalletAssetsResult {
  const session = useWalletSession();
  const wallet = useWalletStore((s) => s.wallet);
  const format = useWalletStore((s) => s.format);
  const activeId = useWalletStore((s) => s.activeId);
  const currentNetworkId = useWalletStore((s) => s.networkId);
  const accountIndex = useWalletStore(selectActiveAccountIndex);

  const plans = useMemo<WalletPlan[]>(() => {
    if (!session || !wallet || !activeId) return [];

    const result: WalletPlan[] = [];

    // SANGO — toujours présent (V1 natif, V2 dérivé via SLIP-0010).
    result.push({
      id: activeId,
      networkId: SANGO_NETWORK_ID,
      accountIndex,
      family: "sango",
      nativeAssetId: "sango",
      nativeSymbol: "SANGO",
      nativeDecimals: 7,
      nativeDisplayName: "Sango Network",
    });

    // Bitcoin + EVM : uniquement V2 (Bip39Wallet).
    if (format === "bip39") {
      result.push({
        id: activeId,
        networkId: BITCOIN_NETWORK_ID,
        accountIndex,
        family: "bitcoin",
        nativeAssetId: "btc",
        nativeSymbol: "BTC",
        nativeDecimals: 8,
        nativeDisplayName: "Bitcoin",
      });

      // Réseau EVM : le courant s'il est EVM, sinon défaut mainnet.
      const evmNetworkId =
        resolveChainFamily(currentNetworkId) === "evm"
          ? currentNetworkId
          : DEFAULT_EVM_NETWORK_ID;
      result.push({
        id: activeId,
        networkId: evmNetworkId,
        accountIndex,
        family: "evm",
        nativeAssetId: "eth",
        nativeSymbol: "ETH",
        nativeDecimals: 18,
        nativeDisplayName: "Ethereum",
      });
    }

    return result;
  }, [
    session,
    wallet,
    format,
    activeId,
    accountIndex,
    currentNetworkId,
  ]);

  const results = useQueries({
    queries: plans.map((plan) => ({
      queryKey: [
        "wallet-assets",
        activeId,
        plan.networkId,
        plan.accountIndex,
      ] as const,
      queryFn: () => fetchWalletAssetsWith(session!, plan),
      enabled: Boolean(session) && Boolean(activeId),
      staleTime: 30_000,
      refetchInterval: 30_000,
    })),
  });

  return useMemo<UseAllWalletAssetsResult>(() => {
    const flat: WalletAsset[] = [];
    let loading = false;
    for (const r of results) {
      if (r.isLoading) loading = true;
      if (r.data) flat.push(...r.data);
    }
    return { assets: flat, loading };
  }, [results]);
}
