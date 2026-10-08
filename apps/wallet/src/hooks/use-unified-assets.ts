import { useMemo } from "react";

import { useQueries } from "@tanstack/react-query";
import {
  bitcoinNetworkById,
  evmNetworkById,
  type AccountRef,
  type AssetRef,
  type ChainFamily,
} from "@sango/wallet-chains";
import type { Token } from "@sango/wallet-chains";
import type { WalletSession } from "@sango/wallet-session";

import { buildWalletSession } from "@/lib/build-wallet-session";
import { resolveChainFamily } from "@/lib/chain-family";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Agrégation des balances cross-wallet (Phase 4, D1·A).
 *
 * **Contrat** (D-Phase4) :
 *   - chaque ligne appartient à un wallet précis (`walletId`) ;
 *   - le wallet actif est exclu (son natif est déjà dans le hero) ;
 *   - natif + tokens (EVM) — pas de fiat, pas de total (D5·B, D10·A,
 *     D11·A) ;
 *   - cache React Query 30 s, clé incluant `walletId` (D12·A) ;
 *   - tri fixe par symbole : ETH, BTC, USDC, USDT, BNB (D5·B).
 *
 * **Pas de cross-refonte** : chaque wallet reste mono-famille. Les
 * sessions secondaires sont construites via `buildWalletSession()`
 * (extraction du provider, D-Phase4·A) — pas de mutation du contrat
 * `WalletSession`.
 */

export type UnifiedAssetKind = "native" | "token";

export interface UnifiedAsset {
  /** Clé unique `{walletId}:{assetId}`. */
  readonly id: string;
  readonly walletId: string;
  readonly networkId: string;
  readonly accountIndex: number;
  readonly family: ChainFamily;
  readonly assetRef: AssetRef;
  readonly kind: UnifiedAssetKind;
  readonly symbol: string;
  readonly name: string;
  readonly subtitle: string;
  readonly decimals: number;
  readonly balance: bigint | null;
  readonly tokenContract?: string;
}

export interface UseUnifiedAssetsResult {
  readonly assets: readonly UnifiedAsset[];
  readonly loading: boolean;
}

const NATIVE_META: Record<string, { symbol: string; decimals: number }> = {
  sango: { symbol: "SANGO", decimals: 7 },
  eth: { symbol: "ETH", decimals: 18 },
  bnb: { symbol: "BNB", decimals: 18 },
  btc: { symbol: "BTC", decimals: 8 },
};

/**
 * Ordre fixe D5·B. Les symboles absents sont ajoutés en fin, triés
 * alphabétiquement (fallback stable).
 */
const SORT_ORDER: readonly string[] = ["ETH", "BTC", "USDC", "USDT", "BNB"];

function sortAssets(a: UnifiedAsset, b: UnifiedAsset): number {
  const ai = SORT_ORDER.indexOf(a.symbol);
  const bi = SORT_ORDER.indexOf(b.symbol);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.symbol.localeCompare(b.symbol);
}

interface WalletPlan {
  readonly id: string;
  readonly networkId: string;
  readonly accountIndex: number;
  readonly family: ChainFamily;
  readonly nativeAssetId: string;
  readonly nativeSymbol: string;
  readonly nativeDecimals: number;
  readonly nativeDisplayName: string;
}

function resolveNativeMeta(
  family: ChainFamily,
  networkId: string,
): { assetId: string; symbol: string; decimals: number; displayName: string } {
  if (family === "sango") {
    return {
      assetId: "sango",
      symbol: "SANGO",
      decimals: 7,
      displayName: "Sango Network",
    };
  }
  if (family === "bitcoin") {
    return {
      assetId: "btc",
      symbol: "BTC",
      decimals: 8,
      displayName: bitcoinNetworkById(networkId)?.name ?? "Bitcoin",
    };
  }
  // EVM
  const network = evmNetworkById(networkId);
  const assetId = network?.nativeAsset ?? "eth";
  const meta = NATIVE_META[assetId] ?? NATIVE_META["eth"]!;
  return {
    assetId,
    symbol: meta.symbol,
    decimals: meta.decimals,
    displayName: network?.name ?? assetId.toUpperCase(),
  };
}

// Wrapper réel utilisé par le hook (reçoit la session via closure).
async function fetchWalletAssetsWith(
  session: WalletSession,
  plan: WalletPlan,
): Promise<UnifiedAsset[]> {
  const account: AccountRef = {
    family: plan.family,
    accountIndex: plan.accountIndex,
    networkId: plan.networkId,
  };

  const assets: UnifiedAsset[] = [];

  // ── Natif ───────────────────────────────────────────────
  const nativeRef: AssetRef = {
    kind: "native",
    assetId: plan.nativeAssetId,
    networkId: plan.networkId,
  };
  let nativeBalance: bigint | null = null;
  try {
    const bal = await session.getBalance(account, nativeRef);
    nativeBalance = bal.amount;
  } catch {
    nativeBalance = null;
  }
  assets.push({
    id: `${plan.id}:${plan.nativeAssetId}`,
    walletId: plan.id,
    networkId: plan.networkId,
    accountIndex: plan.accountIndex,
    family: plan.family,
    assetRef: nativeRef,
    kind: "native",
    symbol: plan.nativeSymbol,
    name: plan.nativeSymbol,
    subtitle: plan.nativeDisplayName,
    decimals: plan.nativeDecimals,
    balance: nativeBalance,
  });

  // ── Tokens (EVM uniquement) ─────────────────────────────
  if (plan.family === "evm") {
    let tokens: readonly Token[] = [];
    try {
      tokens = await session.listTokens(plan.networkId);
    } catch {
      tokens = [];
    }
    for (const token of tokens) {
      let bal: bigint | null = null;
      try {
        bal = await session.getTokenBalance(account, token);
      } catch {
        bal = null;
      }
      assets.push({
        id: `${plan.id}:${token.assetId}`,
        walletId: plan.id,
        networkId: plan.networkId,
        accountIndex: plan.accountIndex,
        family: plan.family,
        assetRef: {
          kind: "token",
          networkId: plan.networkId,
          contract: token.contract,
        },
        kind: "token",
        symbol: token.metadata.symbol,
        name: token.metadata.symbol,
        subtitle: evmNetworkById(plan.networkId)?.name ?? plan.networkId,
        decimals: token.metadata.decimals,
        balance: bal,
        tokenContract: token.contract,
      });
    }
  }

  return assets;
}

export function useUnifiedAssets(): UseUnifiedAssetsResult {
  const storeWallets = useWalletStore((s) => s.wallets);
  const activeId = useWalletStore((s) => s.activeId);
  const walletAccounts = useWalletStore((s) => s.walletAccounts);
  const walletNetworks = useWalletStore((s) => s.walletNetworks);
  const endpoint = useSdkStore((s) => s.endpoint);

  // Plans + sessions pour les wallets non-actifs. Rebuild sur switch
  // est acceptable : `buildWalletSession` ne déclenche aucun RPC, et
  // la queryKey reste stable (donc pas de refetch parasite).
  const plans = useMemo(() => {
    const result: Array<{
      plan: WalletPlan;
      session: WalletSession;
    }> = [];
    for (const [id, entry] of Object.entries(storeWallets)) {
      if (id === activeId) continue;
      const effectiveNetworkId = walletNetworks[id] ?? entry.networkId;
      const family = resolveChainFamily(effectiveNetworkId);
      const accountIndex = walletAccounts[id]?.activeIndex ?? 0;
      const native = resolveNativeMeta(family, effectiveNetworkId);

      result.push({
        plan: {
          id,
          networkId: effectiveNetworkId,
          accountIndex,
          family,
          nativeAssetId: native.assetId,
          nativeSymbol: native.symbol,
          nativeDecimals: native.decimals,
          nativeDisplayName: native.displayName,
        },
        session: buildWalletSession(entry.wallet, endpoint),
      });
    }
    return result;
  }, [storeWallets, activeId, walletNetworks, walletAccounts, endpoint]);

  const queries = plans.map(({ plan, session }) => ({
    queryKey: [
      "unified-assets",
      plan.id,
      plan.networkId,
      plan.accountIndex,
    ] as const,
    queryFn: () => fetchWalletAssetsWith(session, plan),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: true,
  }));

  const results = useQueries({ queries });

  return useMemo<UseUnifiedAssetsResult>(() => {
    const flat: UnifiedAsset[] = [];
    let loading = false;
    for (const r of results) {
      if (r.isLoading) loading = true;
      if (r.data) flat.push(...r.data);
    }
    flat.sort(sortAssets);
    return { assets: flat, loading };
  }, [results]);
}

