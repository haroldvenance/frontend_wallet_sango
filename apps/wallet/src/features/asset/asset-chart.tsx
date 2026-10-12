import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  TIMEFRAMES,
  type AssetPrice,
  type Timeframe,
} from "@/hooks/use-asset-price";
import { useTranslation } from "@/i18n/use-translation";

interface Props {
  readonly data: AssetPrice | null | undefined;
  readonly loading: boolean;
  readonly error: boolean;
  readonly timeframe: Timeframe;
  readonly onTimeframeChange: (t: Timeframe) => void;
  /** `true` si l'asset n'est pas listé (SANGO, tokens inconnus). */
  readonly unavailable: boolean;
}

/**
 * Graphique de prix — Phase 6 (D6-d·A, D6-e·A).
 *
 * **D6-d·A** — les données proviennent de CoinGecko. Aucune courbe
 * n'est fabriquée : si l'asset n'est pas listé ou si l'API échoue,
 * l'UI affiche un état explicite ("indisponible" / "erreur").
 *
 * **D6-e·A** — 5 périodes sélectionnables : 1J, 1S, 1M, 1A, Tout.
 * Le graphe reflète la période réellement chargée.
 */
export function AssetChart({
  data,
  loading,
  error,
  timeframe,
  onTimeframeChange,
  unavailable,
}: Props) {
  const t = useTranslation();

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t.assetDetail.chart.title}</h2>
        {!unavailable && (
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-0.5 text-[10px] font-medium">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                data-testid={`chart-tf-${tf}`}
                onClick={() => onTimeframeChange(tf)}
                className={[
                  "rounded-md px-2 py-1 transition-colors",
                  timeframe === tf
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t.assetDetail.chart.timeframes[tf]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {unavailable && (
          <div className="rounded-xl border border-dashed bg-muted/20 py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t.assetDetail.chart.unavailable}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              {t.assetDetail.chart.unavailableDesc}
            </p>
          </div>
        )}

        {!unavailable && loading && (
          <div className="flex h-[180px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t.assetDetail.chart.loading}
            </p>
          </div>
        )}

        {!unavailable && !loading && error && (
          <div className="flex h-[180px] items-center justify-center text-center">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t.assetDetail.chart.error}
            </p>
          </div>
        )}

        {!unavailable &&
          !loading &&
          !error &&
          data &&
          data.points.length > 0 && (
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.points}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="asset-chart-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="rgb(139 92 246)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="rgb(139 92 246)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "0.75rem",
                    }}
                    labelFormatter={(t) =>
                      new Date(Number(t)).toLocaleString()
                    }
                    formatter={(v) => [
                      `$${Number(v).toLocaleString("en-US", {
                        maximumFractionDigits: 6,
                      })}`,
                      "",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="p"
                    stroke="rgb(139 92 246)"
                    strokeWidth={2}
                    fill="url(#asset-chart-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>
    </section>
  );
}
