import type { Tx } from "@sango/rpc";

/**
 * Page historique.
 *
 * V0.3 — D-SESS-9 résolu : `use-infinite-transactions` passe
 * désormais par `WalletSession.getTransactionPage()`. L'API publique
 * du hook reste `TxPage` de `@sango/rpc` (via un adaptateur explicite
 * de frontière) — cette page n'a pas eu à changer.
 */

import {
  ArrowUpRight,
  Clock3,
  Coins,
  FileCode2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  Unlock,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";

import { flattenTxPages, useInfiniteTransactions } from "@/hooks/use-transactions";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, shortenAddress, shortenHash } from "@/lib/format";
import { classifyTx, displayAmount, txKindLabel } from "@/lib/tx-classify";
import { useSangoWallet } from "@/hooks/use-sango-wallet";

// --- Types -----------------------------------------------------------------

type Filter = "all" | "sent" | "received" | "staking";

interface Row {
  tx: Tx;
  label: string;
  amount: string;
  direction: "in" | "out" | "neutral" | "pending";
  counterparty: string | null;
  icon: ReactElement;
}

// --- Helpers ---------------------------------------------------------------

function iconForKind(kind: number): ReactElement {
  switch (kind) {
    case 0x01: return <ArrowUpRight className="size-4" />;
    case 0x02:
    case 0x03: return <FileCode2 className="size-4" />;
    case 0x04: return <Lock className="size-4" />;
    case 0x05: return <Unlock className="size-4" />;
    case 0x06: return <Coins className="size-4" />;
    case 0x07: return <Undo2 className="size-4" />;
    case 0x08: return <Coins className="size-4" />;
    case 0x09: return <ShieldCheck className="size-4" />;
    case 0x0a: return <Wrench className="size-4" />;
    case 0x0b: return <ShieldAlert className="size-4" />;
    default: return <ArrowUpRight className="size-4" />;
  }
}

function kindLabel(kind: number, t: ReturnType<typeof useTranslation>): string {
  if (kind === 0x01) return t.history.kind.transfer;
  return txKindLabel(kind, t);
}


// --- Composant -------------------------------------------------------------

function STAKING_KINDS_HAS(kind: number): boolean {
  return kind >= 0x04 && kind <= 0x0b;
}

export function HistoryRoute() {
  const t = useTranslation();
  const wallet = useSangoWallet();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(20);

  const [filter, setFilter] = useState<Filter>("all");

  const myAddress = wallet?.identity.addressHex ?? "";
  const allTxs = useMemo(() => flattenTxPages(data), [data]);

  const rows: Row[] = useMemo(() => {
    return allTxs
      .map<Row>((tx) => {
        const { direction, counterparty } = classifyTx(tx, myAddress);
        const value = displayAmount(tx.value);
        const amountStr = value === null ? "—" : formatSango(value);
        return {
          tx,
          label: kindLabel(tx.txKind, t),
          amount: amountStr,
          direction,
          counterparty,
          icon: iconForKind(tx.txKind),
        };
      })
      .filter((row) => {
        if (filter === "all") return true;
        if (filter === "staking") return STAKING_KINDS_HAS(row.tx.txKind);
        if (filter === "sent") return row.direction === "out";
        if (filter === "received") return row.direction === "in";
        return true;
      });
  }, [allTxs, filter, myAddress, t]);

  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t.history.subtitle}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {t.history.title}{" "}
            {total > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                ({total})
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "sent", "received", "staking"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === f
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            ].join(" ")}
          >
            {t.history.filter[f]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? t.history.empty : t.history.emptyFiltered}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {rows.map((row, i) => (
            <HistoryRow key={`${row.tx.hash}-${i}`} row={row} t={t} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex h-10 items-center rounded-xl border bg-card px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isFetchingNextPage ? t.common.loading : t.history.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Ligne -----------------------------------------------------------------

function HistoryRow({
  row,
  t,
}: {
  row: Row;
  t: ReturnType<typeof useTranslation>;
}) {
  const { tx, label, amount, direction, counterparty, icon } = row;
  const isPending = direction === "pending";
  const isIn = direction === "in";
  const isOut = direction === "out";

  const iconCls = isIn
    ? "bg-emerald-500/10 text-emerald-500"
    : isOut
      ? "bg-primary/10 text-primary"
      : isPending
        ? "bg-amber-500/10 text-amber-500"
        : "bg-muted text-muted-foreground";

  return (
    <Link
      to={`/history/${tx.hash}`}
      className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
    >
      <div className={["flex size-9 shrink-0 items-center justify-center rounded-full", iconCls].join(" ")}>
        {isPending ? <Clock3 className="size-4" /> : icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {isPending && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
              {t.history.pending}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {counterparty
            ? `${isIn ? t.history.from : t.history.to} ${shortenAddress(counterparty, 5)}`
            : `#${tx.nonce} · ${shortenHash(tx.hash, 6)}`}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div
          className={[
            "font-mono text-sm font-medium",
            isIn ? "text-emerald-500" : isOut ? "text-foreground" : "text-muted-foreground",
          ].join(" ")}
        >
          {amount === "—" ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <>
              {isIn ? "+" : isOut ? "-" : ""}
              {amount}
              <span className="ml-1 text-xs font-normal text-muted-foreground">SANGO</span>
            </>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {tx.blockHeight !== null ? `#${tx.blockHeight}` : t.history.pending}
        </div>
      </div>
    </Link>
  );
}
