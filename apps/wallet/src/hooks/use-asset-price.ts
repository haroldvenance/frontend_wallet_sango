import { useQuery } from "@tanstack/react-query";

/**
 * Prix + graphique depuis CoinGecko — Phase 6 (D6-d·A).
 *
 * **Mapping assetId → coingeckoId** : limité aux actifs réellement
 * supportés par le wallet. SANGO n'est pas listé (pas de marché public) —
 * le hook retourne `null` sans faire de requête.
 *
 * **Rate limit** : CoinGecko free tier = ~30 req/min. Le cache React
 * Query (`staleTime: 5min`) absorbe la charge normale.
 *
 * **D6-e·A** — 5 périodes : 1J, 1S, 1M, 1A, Tout.
 *
 * ⚠️ Aucune donnée n'est inventée : si l'API échoue ou si l'asset
 * n'est pas listé, on retourne `null` / `isError`, et l'UI affiche
 * un état "indisponible".
 */

export type Timeframe = "1d" | "1w" | "1m" | "1y" | "all";

export const TIMEFRAMES: readonly Timeframe[] = [
  "1d",
  "1w",
  "1m",
  "1y",
  "all",
];

const COINGECKO_IDS: Record<string, string> = {
  eth: "ethereum",
  btc: "bitcoin",
  bnb: "binancecoin",
  usdc: "usd-coin",
  usdt: "tether",
  // sango : pas listé
};

const DAYS_BY_TIMEFRAME: Record<Timeframe, string> = {
  "1d": "1",
  "1w": "7",
  "1m": "30",
  "1y": "365",
  all: "max",
};

const BASE_URL = "https://api.coingecko.com/api/v3";
const STALE_MS = 5 * 60 * 1000;

export interface PricePoint {
  /** Timestamp en ms. */
  readonly t: number;
  /** Prix en USD. */
  readonly p: number;
}

export interface AssetPrice {
  readonly current: number;
  readonly change24hPct: number | null;
  readonly points: readonly PricePoint[];
}

interface RawMarketChart {
  readonly prices: readonly [number, number][];
}

interface RawSimplePrice {
  readonly [cgId: string]: {
    readonly usd?: number;
    readonly usd_24h_change?: number;
  };
}

export function useAssetPrice(
  assetId: string | undefined,
  timeframe: Timeframe,
) {
  const cgId = assetId ? COINGECKO_IDS[assetId.toLowerCase()] : undefined;

  return useQuery<AssetPrice | null, Error>({
    queryKey: ["asset-price", cgId, timeframe],
    queryFn: async () => {
      if (!cgId) return null;

      const days = DAYS_BY_TIMEFRAME[timeframe];

      // 1. Market chart (graphique).
      const chartRes = await fetch(
        `${BASE_URL}/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`,
      );
      if (!chartRes.ok) {
        throw new Error(`CoinGecko chart HTTP ${chartRes.status}`);
      }
      const chart = (await chartRes.json()) as RawMarketChart;

      // 2. Prix actuel + variation 24h (header).
      const priceRes = await fetch(
        `${BASE_URL}/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`,
      );
      let current: number | null = null;
      let change: number | null = null;
      if (priceRes.ok) {
        const price = (await priceRes.json()) as RawSimplePrice;
        const entry = price[cgId];
        if (entry?.usd !== undefined) current = entry.usd;
        if (entry?.usd_24h_change !== undefined) {
          change = entry.usd_24h_change;
        }
      }

      // Fallback : si le header n'a rien, on prend le dernier point du
      // chart.
      const points: PricePoint[] = chart.prices.map(([t, p]) => ({ t, p }));
      if (current === null && points.length > 0) {
        current = points[points.length - 1]!.p;
      }

      return {
        current: current ?? 0,
        change24hPct: change,
        points,
      };
    },
    enabled: Boolean(cgId),
    staleTime: STALE_MS,
    refetchInterval: STALE_MS,
    retry: 1,
  });
}
