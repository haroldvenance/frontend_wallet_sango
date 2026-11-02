import type { HistoryItem } from "@sango/wallet-chains";
import { Bip39Wallet } from "@sango/wallet-core";
import { ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { useMemo, useState } from "react";

import { ActivitySection } from "@/components/ui/activity-section";
import { HistoryError } from "@/components/ui/history-error";
import {
  HistoryFilterChips,
  type HistoryFilter,
} from "@/components/ui/history-filter-chips";
import { HistorySkeleton } from "@/components/ui/history-skeleton";
import { ExplorerLinkEvm } from "@/features/evm/explorer-link-evm";
import { useEvmHistory } from "@/hooks/use-evm-history";
import { useTranslation } from "@/i18n/use-translation";
import { formatNativeShort } from "@/lib/eth";
import { truncateMiddle } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

function friendlyError(
  msg: string,
  t: ReturnType<typeof useTranslation>,
): string {
  if (
    msg.includes("rate limit") ||
    msg.includes("Max rate limit reached") ||
    msg.includes("Free API access is not supported")
  ) {
    return t.history.evmErrors.rateLimited;
  }
  if (msg.includes("Invalid API Key") || msg.includes("Unauthorized")) {
    return t.history.evmErrors.serviceUnavailable;
  }
  return t.history.evmErrors.generic;
}

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
  const from = (item.from ?? "").toLowerCase();
  const to = (item.to ?? "").toLowerCase();
  if (!from || !to) return "unknown";
  if (from === myAddress && to !== myAddress) return "out";
  if (to === myAddress && from !== myAddress) return "in";
  return "neutral";
}

export function HistoryListEvm() {
  const t = useTranslation();
  const wallet = useWalletStore((s) => s.wallet);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useEvmHistory(20);

  const [filter, setFilter] = useState<HistoryFilter>("all");

  const myAddress = useMemo(() => {
    if (wallet instanceof Bip39Wallet) {
      return wallet.defaultAddress.toLowerCase();
    }
    return "";
  }, [wallet]);

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
  const isNeutral = direction === "neutral";
  const isUnknown = direction === "unknown";
  const isPending = item.status === "pending";
  const isFailed = item.status === "failed";

  // Pour "unknown" on n'affiche PAS de contrepartie (on ne sait pas qui).
  const counterparty = isSent
    ? item.to
    : isReceived
      ? item.from
      : "";

  const directionLabel = isSent
    ? t.history.direction.sent
    : isReceived
      ? t.history.direction.received
      : isUnknown
        ? t.history.direction.unknown
        : t.history.direction.internal;

  const iconCls = isFailed
    ? "bg-destructive/10 text-destructive"
    : isPending
      ? "bg-amber-500/10 text-amber-500"
      : isSent
        ? "bg-indigo-500/10 text-indigo-500"
        : isReceived
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-muted text-muted-foreground";

  const date = item.timestamp
    ? new Date(item.timestamp * 1000).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const assetSymbol =
    item.assetRef.kind === "native"
      ? item.assetRef.assetId.toUpperCase()
      : t.history.asset.token;

  // Affichage du signe : uniquement si la direction est fiable.
  const sign = isSent ? "-" : isReceived ? "+" : "";

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconCls}`}
      >
        {isPending ? (
          <Clock className="size-4" />
        ) : isSent ? (
          <ArrowUpRight className="size-4" />
        ) : (
          <ArrowDownLeft className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{directionLabel}</span>
          {isPending && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
              {t.history.pending}
            </span>
          )}
          {isFailed && (
            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              {t.history.statusFailed}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {counterparty ? (
            <span className="font-mono">
              {truncateMiddle(counterparty, 8, 6)}
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
          {isUnknown ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <>
              {sign}
              {formatNativeShort(item.amount)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {assetSymbol}
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5">
          <ExplorerLinkEvm
            hash={item.txHash}
            networkId={item.networkId}
            className="text-[10px] text-muted-foreground hover:text-primary"
          />
        </div>
      </div>
    </div>
  );
}