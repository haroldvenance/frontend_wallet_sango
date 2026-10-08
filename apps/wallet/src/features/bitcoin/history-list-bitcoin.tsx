import type { HistoryItem } from "@sango/wallet-chains";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Clock } from "lucide-react";

import { ActivitySection } from "@/components/ui/activity-section";
import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useBitcoinHistory } from "@/hooks/use-bitcoin-history";
import { formatBitcoin } from "@/lib/bitcoin";
import { truncateMiddle } from "@/lib/format";

import { ExplorerLinkBitcoin } from "./explorer-link-bitcoin";

/**
 * Historique Bitcoin — Patch A.2 (mockup-faithful).
 *
 * **D7·A** — 3 directions : Reçue / Envoyée / Interne (delta = 0).
 * **D8·B** — `counterparty` résolu par le provider (premier ≠ nous).
 * **D9·A** — tx pending sans date (affiche "En attente").
 * **D10·A** — 20 items, pas de pagination.
 *
 * Pas de filtre, pas de fiat, pas de "Voir tout".
 */
export function HistoryListBitcoin() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useBitcoinHistory(20);
  const addressInfo = useBitcoinAddress();
  const myAddress = addressInfo?.address ?? "";

  return (
    <ActivitySection
      onRefresh={() => void refetch()}
      isRefreshing={isFetching}
    >
      {isLoading && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      )}

      {isError && (
        <div className="p-6 text-center text-xs text-amber-600 dark:text-amber-400">
          {error.message}
        </div>
      )}

      {!isLoading && !isError && (!data || data.items.length === 0) && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Aucune transaction pour ce compte.
        </div>
      )}

      {data &&
        data.items.length > 0 &&
        data.items.map((item) => (
          <HistoryRow key={item.txHash} item={item} myAddress={myAddress} />
        ))}
    </ActivitySection>
  );
}

// ── Ligne ───────────────────────────────────────────────────

interface RowProps {
  readonly item: HistoryItem;
  readonly myAddress: string;
}

function HistoryRow({ item, myAddress }: RowProps) {
  const isSent = item.from === myAddress && item.to !== myAddress;
  const isReceived = item.to === myAddress && item.from !== myAddress;
  const isInternal = item.from === myAddress && item.to === myAddress;
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

  // D7·A — delta = 0 → pas de signe, pas de montant significatif.
  const amountStr = isInternal ? "0" : formatBitcoin(item.amount);
  const sign = isSent ? "-" : isReceived ? "+" : "";

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
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
            className="text-[10px] text-muted-foreground hover:text-primary"
          />
        </div>
      </div>
    </div>
  );
}
