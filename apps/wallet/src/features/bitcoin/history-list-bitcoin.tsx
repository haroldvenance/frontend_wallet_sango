import type { HistoryItem } from "@sango/wallet-chains";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ActivitySection } from "@/components/ui/activity-section";
import { HistoryError } from "@/components/ui/history-error";
import {
  HistoryFilterChips,
  type HistoryFilter,
} from "@/components/ui/history-filter-chips";
import { HistorySkeleton } from "@/components/ui/history-skeleton";
import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useBitcoinHistory } from "@/hooks/use-bitcoin-history";
import { useTranslation } from "@/i18n/use-translation";
import { formatBitcoin } from "@/lib/bitcoin";
import { truncateMiddle } from "@/lib/format";

import { ExplorerLinkBitcoin } from "./explorer-link-bitcoin";

/**
 * Historique Bitcoin — parité avec SANGO (Phase 13-B).
 *
 * **Ajouts** : filtres (tout/envoyé/reçu), skeletons, erreur + retry.
 * Distinct de l'état vide.
 *
 * **Hors scope** : pagination (limit 20). Reporté Session 2.
 */
type Direction = "in" | "out" | "neutral";

interface Row {
  readonly item: HistoryItem;
  readonly direction: Direction;
}

export function HistoryListBitcoin() {
  const t = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useBitcoinHistory(20);
  const addressInfo = useBitcoinAddress();
  const myAddress = addressInfo?.address ?? "";

  const [filter, setFilter] = useState<HistoryFilter>("all");

  const allRows: Row[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map<Row>((item) => {
      const direction: Direction =
        item.from === myAddress && item.to !== myAddress
          ? "out"
          : item.to === myAddress && item.from !== myAddress
            ? "in"
            : "neutral";
      return { item, direction };
    });
  }, [data, myAddress]);

  const rows = useMemo(() => {
    if (filter === "all") return allRows;
    if (filter === "sent") return allRows.filter((r) => r.direction === "out");
    if (filter === "received")
      return allRows.filter((r) => r.direction === "in");
    return allRows;
  }, [allRows, filter]);

  const hasAny = allRows.length > 0;

  const filterLabels: Record<HistoryFilter, string> = {
    all: t.history.filter.all,
    sent: t.history.filter.sent,
    received: t.history.filter.received,
  };

  return (
    <div>
      {hasAny && !isLoading && !isError && (
        <HistoryFilterChips
          value={filter}
          onChange={setFilter}
          labels={filterLabels}
        />
      )}

      <ActivitySection
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      >
        {isLoading && <HistorySkeleton rows={5} />}

        {isError && (
          <HistoryError
            message={error.message}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && !hasAny && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t.history.empty}
          </div>
        )}

        {!isLoading && !isError && hasAny && rows.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t.history.emptyFiltered}
          </div>
        )}

        {rows.map((row) => (
          <HistoryRow key={row.item.txHash} row={row} />
        ))}
      </ActivitySection>
    </div>
  );
}

// ── Ligne ───────────────────────────────────────────────────

function HistoryRow({ row }: { readonly row: Row }) {
  const { item, direction } = row;
  const isSent = direction === "out";
  const isReceived = direction === "in";
  const isInternal = direction === "neutral";
  const isPending = item.status === "pending";

  const directionLabel = isSent
    ? "Envoyée"
    : isReceived
      ? "Reçue"
      : isInternal
        ? "Interne"
        : "Transaction";

  const counterparty = isSent ? item.to : isReceived ? item.from : "";

  const iconCls = isPending
    ? "bg-amber-500/10 text-amber-500"
    : isSent
      ? "bg-indigo-500/10 text-indigo-500"
      : isReceived
        ? "bg-emerald-500/10 text-emerald-500"
        : "bg-muted text-muted-foreground";

  const Icon = isPending
    ? Clock
    : isSent
      ? ArrowUpRight
      : isReceived
        ? ArrowDownLeft
        : ArrowLeftRight;

  const date = item.timestamp
    ? new Date(item.timestamp * 1000).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const amountStr = isInternal ? "0" : formatBitcoin(item.amount);
  const sign = isSent ? "-" : isReceived ? "+" : "";

  return (
    <div
      id={`tx-${item.txHash}`}
      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconCls}`}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{directionLabel}</span>
          {isPending && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
              en attente
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {counterparty ? (
            <span className="font-mono">
              {truncateMiddle(counterparty, 10, 6)}
            </span>
          ) : (
            <span className="italic">—</span>
          )}
          <span>·</span>
          <span>{date}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-medium">
          {sign}
          {amountStr}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            BTC
          </span>
        </div>
        <div className="mt-0.5">
          <ExplorerLinkBitcoin
            hash={item.txHash}
            networkId={item.networkId}
            className="text-[10px] text-muted-foreground hover:text-primary"
          />
        </div>
      </div>
    </div>
  );
}
