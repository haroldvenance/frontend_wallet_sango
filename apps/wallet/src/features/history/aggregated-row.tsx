import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Clock,
  XCircle,
} from "lucide-react";

import { NetworkLogo } from "@/components/branding/network-logo";
import { ExplorerLinkBitcoin } from "@/features/bitcoin/explorer-link-bitcoin";
import { ExplorerLinkEvm } from "@/features/evm/explorer-link-evm";
import type { AggregatedTx } from "@/hooks/use-aggregated-history";
import { useTranslation } from "@/i18n/use-translation";
import { classifyRelativeTime } from "@/lib/format-relative-time";
import { truncateMiddle } from "@/lib/format";

export function AggregatedRow({ tx }: { readonly tx: AggregatedTx }) {
  const t = useTranslation();

  const isSent = tx.direction === "out";
  const isReceived = tx.direction === "in";
  const isNeutral = tx.direction === "neutral";
  // Tout ce qui n'est ni in/out/neutral est traité comme "unknown" —
  // jamais affiché comme "Reçu".
  const isUnknown = !isSent && !isReceived && !isNeutral;
  const isPending = tx.status === "pending";
  const isFailed = tx.status === "failed";

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

  const Icon = isPending
    ? Clock
    : isFailed
      ? XCircle
      : isSent
        ? ArrowUpRight
        : isReceived
          ? ArrowDownLeft
          : ArrowLeftRight;

  const date = formatDate(tx, t);
  const amountStr =
    tx.amount === null ? "—" : formatAmount(tx.amount, tx.symbol, tx.source);
  // Affichage du signe : uniquement si la direction est fiable.
  const sign = isSent ? "-" : isReceived ? "+" : "";
  const feeStr = formatFee(tx);

  return (
    <div
      id={`tx-${tx.txHash}`}
      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
    >
      <div className="relative shrink-0">
        <div
          className={`flex size-8 items-center justify-center rounded-full ${iconCls}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full bg-card p-0.5 ring-2 ring-card">
          <NetworkLogo networkId={tx.networkId} size={14} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {directionLabel} {tx.symbol}
          </span>
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
          {tx.counterparty ? (
            <span className="font-mono">
              {truncateMiddle(tx.counterparty, 10, 6)}
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
          {tx.amount === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <>
              <span
                className={
                  isReceived
                    ? "text-emerald-500"
                    : isSent
                      ? "text-foreground"
                      : "text-muted-foreground"
                }
              >
                {sign}
                {amountStr}
              </span>
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {tx.symbol}
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5">
          {tx.source === "evm" && (
            <ExplorerLinkEvm
              hash={tx.txHash}
              networkId={tx.networkId}
              className="text-[10px] text-muted-foreground hover:text-primary"
            />
          )}
          {tx.source === "bitcoin" && (
            <ExplorerLinkBitcoin
              hash={tx.txHash}
              networkId={tx.networkId}
              className="text-[10px] text-muted-foreground hover:text-primary"
            />
          )}
          {tx.source === "sango" && (
            <span className="text-[10px] text-muted-foreground">
              {tx.txHash.slice(0, 10)}…
            </span>
          )}
        </div>
        {feeStr && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {t.history.fee.replace("{value}", feeStr)}
          </p>
        )}
      </div>
    </div>
  );
}

function formatDate(
  tx: AggregatedTx,
  t: ReturnType<typeof useTranslation>,
): string {
  if (tx.timestamp === null) {
    return tx.blockHeight !== null ? `#${tx.blockHeight}` : "—";
  }
  const rt = classifyRelativeTime(tx.timestamp);
  switch (rt.kind) {
    case "now":
      return t.history.relative.justNow;
    case "seconds":
      return t.history.relative.seconds.replace("{n}", String(rt.value));
    case "minutes":
      return t.history.relative.minutes.replace("{n}", String(rt.value));
    case "hours":
      return t.history.relative.hours.replace("{n}", String(rt.value));
    case "days":
      return t.history.relative.days.replace("{n}", String(rt.value));
    case "absolute":
      return new Date(rt.seconds * 1000).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
  }
}

export function formatFee(tx: AggregatedTx): string | null {
  if (tx.fee === null || tx.fee === 0) return null;

  if (tx.source === "bitcoin") {
    const sats = Math.round(tx.fee * 1e8);
    if (sats <= 0) return null;
    return `${sats.toLocaleString(undefined)} sats`;
  }

  if (tx.source === "evm") {
    const formatted = tx.fee.toLocaleString(undefined, {
      maximumFractionDigits: 8,
      minimumFractionDigits: 0,
    });
    return `${formatted} ${tx.symbol}`;
  }

  return null;
}

export function formatAmount(
  v: number,
  symbol: string,
  source: AggregatedTx["source"],
): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);

  if (source === "bitcoin" && abs < 0.001) {
    return Math.round(abs * 1e8).toLocaleString(undefined);
  }

  const maxDecimals =
    symbol === "BTC" ? 8 : abs < 1 ? 6 : abs < 100 ? 4 : 2;
  return v.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
  });
}