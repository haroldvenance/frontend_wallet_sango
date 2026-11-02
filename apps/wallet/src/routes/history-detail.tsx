import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useTransaction } from "@/hooks/use-transactions";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, truncateMiddle } from "@/lib/format";
import { EXPLORER_URL } from "@/lib/config";
import { txKindLabel } from "@/lib/tx-classify";

/**
 * Retourne un bigint si `value` est un entier décimal valide, `null` sinon.
 * Empêche le crash si le backend retourne "", "0x", "null", etc.
 */
function safeBigInt(value: unknown): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Valide qu'un lien explorer est sûr à afficher.
 * HTTPS strict, refuse loopback et IP privées.
 */
function isValidExplorerBase(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "[::1]" ||
      host.endsWith(".local")
    ) {
      return false;
    }
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function CopyableValue({ value, label }: { value: string; label: string }) {
  const t = useTranslation();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1200);
    } catch {
      /* silence */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${t.common.copy} ${label}`}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <span className="break-all">{value}</span>
      {copied ? (
        <span className="text-[10px] text-emerald-500">{t.common.copied}</span>
      ) : (
        <Copy className="size-3 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4 border-b py-3 last:border-b-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="break-all text-sm">{children}</dd>
    </div>
  );
}

export function HistoryDetailRoute() {
  const t = useTranslation();
  const { hash } = useParams<{ hash: string }>();
  const { data: tx, isLoading, isError } = useTransaction(
    (hash ?? null) as `0x${string}` | null,
  );

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
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <ArrowLeft className="size-3" /> {t.history.backToList}
        </Link>
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {t.history.notFound}
        </div>
      </div>
    );
  }

  const isPending = tx.blockHeight === null;
  const value = safeBigInt(tx.value);
  const gasLimit = safeBigInt(tx.gasLimit);
  const maxFee = safeBigInt(tx.maxFee);
  const priorityFee = safeBigInt(tx.priorityFee);

  const explorerUrlSafe = isValidExplorerBase(EXPLORER_URL);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/history"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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

      {value !== null && value > 0n && (
        <div className="mt-4 rounded-2xl border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {t.history.amount}
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold">
            {formatSango(value)}{" "}
            <span className="text-base font-normal text-muted-foreground">
              SANGO
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border bg-card p-5">
        <dl>
          <Row label={t.history.hash}>
            <CopyableValue value={tx.hash} label="hash" />
          </Row>
          <Row label={t.history.block}>
            {isPending ? (
              <span className="text-muted-foreground">{t.history.mempool}</span>
            ) : (
              <span>#{tx.blockHeight}</span>
            )}
          </Row>
          <Row label={t.history.sender}>
            <CopyableValue value={tx.sender} label="sender" />
          </Row>
          {tx.recipient && (
            <Row label={t.history.recipient}>
              <CopyableValue value={tx.recipient} label="recipient" />
            </Row>
          )}
        </dl>
      </div>

      <details className="mt-4 rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          {t.history.advancedDetails}
        </summary>
        <dl className="mt-3">
          <Row label={t.history.nonce}>{tx.nonce}</Row>
          {gasLimit !== null && (
            <Row label={t.history.gasLimit}>{gasLimit.toString()}</Row>
          )}
          {maxFee !== null && (
            <Row label={t.history.maxFee}>{maxFee.toString()}</Row>
          )}
          {priorityFee !== null && (
            <Row label={t.history.priorityFee}>
              {priorityFee.toString()}
            </Row>
          )}
          {tx.blockHash && (
            <Row label={t.history.block}>
              <span className="font-mono text-xs">
                {truncateMiddle(tx.blockHash, 10, 8)}
              </span>
            </Row>
          )}
        </dl>
      </details>

      {explorerUrlSafe && (
        <div className="mt-4">
          <a
            href={`${EXPLORER_URL.replace(/\/$/, "")}/tx/${encodeURIComponent(tx.hash)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t.history.viewInExplorer}
          </a>
        </div>
      )}
    </div>
  );
}