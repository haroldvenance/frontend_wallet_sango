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

type Direction = "in" | "out" | "neutral" | "unknown";

interface Row {
  readonly item: HistoryItem;
  readonly direction: Direction;
}

function classifyDirection(
  item: HistoryItem,
  myAddress: string,
): Direction {
  if (!myAddress) return "unknown";
  if (!item.from || !item.to) return "unknown";
  if (item.from === myAddress && item.to !== myAddress) return "out";
  if (item.to === myAddress && item.from !== myAddress) return "in";
  return "neutral";
}

function friendlyError(
  msg: string,
  t: ReturnType<typeof useTranslation>,
): string {
  if (msg.includes("rate limit") || msg.includes("429")) {
    return t.history.evmErrors.rateLimited;
  }
  return t.history.evmErrors.generic;
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
    return data.items.map<Row>((item) => ({
      item,
      direction: classifyDirection(item, myAddress),
    }));
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

        {isError && error && (
          <HistoryError
            message={friendlyError(error.message, t)}
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

function HistoryRow({ row }: { readonly row: Row }) {
  const t = useTranslation();
  const { item, direction } = row;
  const isSent = direction === "out";
  const isReceived = direction === "in";
  const isUnknown = direction === "unknown";
  const isPending = item.status === "pending";

  const directionLabel = isSent
    ? t.history.direction.sent
    : isReceived
      ? t.history.direction.received
      : isUnknown
        ? t.history.direction.unknown
        : t.history.direction.internal;

  const counterparty = isSent
    ? item.to
    : isReceived
      ? item.from
      : "";

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
    ? new Date(item.timestamp * 1000).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  // Un montant n'est affiché que si la direction est fiable.
  // Ni "neutral" ni "unknown" ne sont "0 BTC" — ce sont des états
  // où l'information de flux est absente.
  const showAmount = isSent || isReceived;
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
              {t.history.pending}
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
          {showAmount ? (
            <>
              {sign}
              {formatBitcoin(item.amount)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                BTC
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
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