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
import { truncateMiddle } from "@/lib/format";

/**
 * **Phase 13-C** — Row cross-chain partagée entre le dashboard
 * (`RecentActivityAggregated`) et l'historique unifié
 * (`UnifiedHistoryRoute`).
 *
 * **Extraction pure** : aucune logique modifiée par rapport à la
 * version inline du dashboard. Ajout d'un `id="tx-<hash>"` pour que
 * le deep-link des notifications (Phase 12-E) fonctionne aussi
 * depuis la route unifiée.
 *
 * **Hors scope** : traduire les libellés "Envoyée/Reçue/Interne"
 * (strings hardcodées en V1 — à internationaliser Phase 13-D).
 */
export function AggregatedRow({ tx }: { readonly tx: AggregatedTx }) {
  const isSent = tx.direction === "out";
  const isReceived = tx.direction === "in";
  const isPending = tx.status === "pending";
  const isFailed = tx.status === "failed";

  const directionLabel = isSent
    ? "Envoyée"
    : isReceived
      ? "Reçue"
      : "Interne";

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

  const date = tx.timestamp
    ? new Date(tx.timestamp * 1000).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : tx.blockHeight !== null
      ? `#${tx.blockHeight}`
      : "—";

  const amountStr =
    tx.amount === null ? "—" : formatAmount(tx.amount, tx.symbol);

  const sign = isSent ? "-" : isReceived ? "+" : "";

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
              en attente
            </span>
          )}
          {isFailed && (
            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              échouée
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
      </div>
    </div>
  );
}

export function formatAmount(v: number, symbol: string): string {
  if (v === 0) return "0";
  if (Math.abs(v) < 0.0001) {
    return v.toExponential(2);
  }
  const maxDecimals = symbol === "BTC" || Math.abs(v) < 1 ? 8 : 4;
  return v.toLocaleString("en-US", {
    maximumFractionDigits: maxDecimals,
  });
}
