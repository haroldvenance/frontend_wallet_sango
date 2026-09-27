import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useTransaction } from "@/hooks/use-transactions";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango } from "@/lib/format";
import { EXPLORER_URL } from "@/lib/config";
import { txKindLabel } from "@/lib/tx-classify";

function shortHex(h: string, head = 10, tail = 8): string {
  if (h.length <= head + tail + 2) return h;
  return `${h.slice(0, 2 + head)}…${h.slice(-tail)}`;
}

function CopyableHex({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-primary"
      title={`Copier ${label}`}
    >
      {value}
      {copied ? (
        <span className="text-emerald-500 text-[10px]">copié</span>
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4 border-b py-3 last:border-b-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm">{children}</dd>
</div>
  );
}

export function HistoryDetailRoute() {
  const t = useTranslation();
  const { hash } = useParams<{ hash: string }>();
  const { data: tx, isLoading, isError, error } = useTransaction((hash ?? null) as `0x${string}` | null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (isError || !tx) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> {t.history.backToList}
        </Link>
        <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {isError ? error.message : t.history.notFound}
        </div>
      </div>
    );
  }

  const isPending = tx.blockHeight === null;
  const value = BigInt(tx.value);
  const maxFee = BigInt(tx.maxFee);
  const priorityFee = BigInt(tx.priorityFee);
  const gasLimit = BigInt(tx.gasLimit);
  const feeEstimate = gasLimit * (maxFee + priorityFee);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/history"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t.history.backToList}
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {txKindLabel(tx.txKind, t)}
        </h1>
        {isPending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
            <Clock3 className="size-3" /> {t.history.pending}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
            <CheckCircle2 className="size-3" /> {t.history.included}
          </span>
        )}
      </div>

      {value > 0n && (
        <div className="mt-4 rounded-2xl border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {t.history.amount}
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold">
            {formatSango(value)}{" "}
            <span className="text-base font-normal text-muted-foreground">SANGO</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            {value.toString()} base units
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border bg-card p-5">
        <dl>
          <Row label={t.history.hash}>
            <CopyableHex value={tx.hash} label="hash" />
          </Row>
          <Row label={t.history.block}>
            {isPending ? (
              <span className="text-muted-foreground">{t.history.mempool}</span>
            ) : (
              <span>
                #{tx.blockHeight}
                {tx.blockHash && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {shortHex(tx.blockHash)}
                  </span>
                )}
                {tx.txIndex !== null && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (index {tx.txIndex})
                  </span>
                )}
              </span>
            )}
          </Row>
          <Row label={t.history.nonce}>{tx.nonce}</Row>
          <Row label={t.history.sender}>
            <CopyableHex value={tx.sender} label="sender" />
          </Row>
          {tx.recipient && (
            <Row label={t.history.recipient}>
              <CopyableHex value={tx.recipient} label="recipient" />
            </Row>
          )}
          <Row label={t.history.gasLimit}>{gasLimit.toString()}</Row>
          <Row label={t.history.maxFee}>{maxFee.toString()} base units/gas</Row>
          <Row label={t.history.priorityFee}>{priorityFee.toString()} base units/gas</Row>
          <Row label={t.history.feeEstimate}>
            {formatSango(feeEstimate)}{" "}
            <span className="text-xs text-muted-foreground">SANGO (max)</span>
          </Row>
          {tx.data && tx.data !== "0x" && (
            <Row label={t.history.data}>
              <span className="font-mono text-xs">{tx.data}</span>
            </Row>
          )}
        </dl>
      </div>

      <div className="mt-4">
        <a
          href={`${EXPLORER_URL}/tx/${tx.hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium hover:bg-accent"
        >
          Voir dans l&apos;explorateur
        </a>
      </div>
    </div>
  );
}
