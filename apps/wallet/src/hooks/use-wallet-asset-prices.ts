import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

/**
 * Prix USD + variation 24h **batchés** pour N assets — Phase 8
 * (D8-d·A, D8-h·A).
 *
 * **Un seul appel CoinGecko** (`/simple/price?ids=...`) pour tous les
 * assets demandés. Le free tier limite à ~30 req/min ; un batch est
 * la seule approche viable pour une vue multi-chain.
 *
 * **Mapping assetId → coingeckoId** : limité aux actifs réellement
 * supportés. SANGO n'est pas listé (pas de marché public) → absent
 * du map → l'UI affiche `—` pour son prix (D8-h·A).
 *
 * **Comportement** : si l'API échoue, `prices` reste vide et l'UI
 * affiche `—`. Aucune donnée inventée.
 */

const COINGECKO_IDS: Record<string, string> = {
  eth: "ethereum",
  btc: "bitcoin",
  bnb: "binancecoin",
  usdc: "usd-coin",
  usdt: "tether",
  // sango : non listé
};

const BASE_URL = "https://api.coingecko.com/api/v3";
const STALE_MS = 5 * 60 * 1000;

export interface AssetPriceInfo {
  readonly usd: number;
  readonly change24hPct: number | null;
}

interface RawSimplePrice {
  readonly [cgId: string]: {
    readonly usd?: number;
    readonly usd_24h_change?: number;
  };
}

export interface UseWalletAssetPricesResult {
  /** Map `assetId` (lowercase) → prix. Absent si non listé ou erreur. */
  readonly prices: Readonly<Record<string, AssetPriceInfo | undefined>>;
  readonly loading: boolean;
  readonly error: boolean;
}

export function useWalletAssetPrices(
  assetIds: readonly string[],
): UseWalletAssetPricesResult {
  // Dédoublonne + résout les ids CoinGecko.
  const cgIds = useMemo(() => {
    const set = new Set<string>();
    for (const id of assetIds) {
      const cg = COINGECKO_IDS[id.toLowerCase()];
      if (cg) set.add(cg);
    }
    return Array.from(set).sort();
  }, [assetIds]);

  const query = useQuery<RawSimplePrice, Error>({
    queryKey: ["wallet-asset-prices-batch", ...cgIds] as const,
    queryFn: async () => {
      if (cgIds.length === 0) return {};
      const url = `${BASE_URL}/simple/price?ids=${cgIds.join(",")}&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`CoinGecko HTTP ${res.status}`);
      }
      return (await res.json()) as RawSimplePrice;
    },
    enabled: cgIds.length > 0,
    staleTime: STALE_MS,
    refetchInterval: STALE_MS,
    retry: 1,
  });

  const prices = useMemo<
    Record<string, AssetPriceInfo | undefined>
  >(() => {
    const out: Record<string, AssetPriceInfo | undefined> = {};
    const data = query.data ?? {};
    for (const assetId of assetIds) {
      const cg = COINGECKO_IDS[assetId.toLowerCase()];
      if (!cg) continue;
      const entry = data[cg];
      if (entry?.usd !== undefined) {
        out[assetId.toLowerCase()] = {
          usd: entry.usd,
          change24hPct: entry.usd_24h_change ?? null,
        };
      }
    }
    return out;
  }, [assetIds, query.data]);

  return {
    prices,
    loading: query.isLoading,
    error: query.isError,
  };
}
