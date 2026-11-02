import { bitcoinNetworkById, evmNetworkById } from "@sango/wallet-chains";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AggregatedRow } from "@/features/history/aggregated-row";
import {
  useAggregatedHistory,
  type AggregatedSourceKind,
} from "@/hooks/use-aggregated-history";
import { useTranslation } from "@/i18n/use-translation";

type DirectionFilter = "all" | "sent" | "received";
type FamilyFilter = "all" | AggregatedSourceKind;

function humanNetworkName(id: string): string {
  return (
    evmNetworkById(id)?.name ??
    bitcoinNetworkById(id)?.name ??
    id
  );
}

export function UnifiedHistoryList() {
  const t = useTranslation();
  const { txs, loading, isFetching, sourceErrors, refetch } =
    useAggregatedHistory(50);

  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [family, setFamily] = useState<FamilyFilter>("all");

  const filtered = useMemo(() => {
    return txs.filter((tx) => {
      if (family !== "all" && tx.source !== family) return false;
      if (direction === "sent" && tx.direction !== "out") return false;
      if (direction === "received" && tx.direction !== "in") return false;
      return true;
    });
  }, [txs, direction, family]);

  const humanErrors = sourceErrors.map(humanNetworkName);
  const showEmpty = !loading && filtered.length === 0;
  const showNoSourceError = showEmpty && sourceErrors.length === 0;
  const showAllSourcesDown =
    showEmpty && sourceErrors.length > 0 && txs.length === 0;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="size-3" /> {t.history.backToDashboard}
      </Link>

      <div className="mt-6 mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t.history.subtitleAll}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {t.history.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label={t.history.refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {t.history.refresh}
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <div
          role="group"
          aria-label={t.history.filter.all}
          className="flex flex-wrap gap-2"
        >
          {(["all", "sent", "received"] as const).map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`history-dir-${f}`}
              aria-pressed={direction === f}
              onClick={() => setDirection(f)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                direction === f
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              ].join(" ")}
            >
              {t.history.filter[f]}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label={t.history.familyFilter.all}
          className="flex flex-wrap gap-2"
        >
          {(["all", "evm", "bitcoin", "sango"] as const).map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`history-fam-${f}`}
              aria-pressed={family === f}
              onClick={() => setFamily(f)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                family === f
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              ].join(" ")}
            >
              {t.history.familyFilter[f]}
            </button>
          ))}
        </div>
      </div>

      {loading && txs.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      )}

      {showNoSourceError && (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {direction === "all" && family === "all"
            ? t.history.empty
            : t.history.emptyFiltered}
        </div>
      )}

      {showAllSourcesDown && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center text-xs text-amber-700 dark:text-amber-400">
          {t.activity.sourcesUnavailable.replace(
            "{networks}",
            humanErrors.join(", "),
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {filtered.map((tx) => (
            <AggregatedRow key={`${tx.networkId}:${tx.txHash}`} tx={tx} />
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && sourceErrors.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-[11px] text-amber-700 dark:text-amber-400">
          {t.activity.sourcesUnavailable.replace(
            "{networks}",
            humanErrors.join(", "),
          )}
        </div>
      )}
    </div>
  );
}