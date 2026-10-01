import type { ReactNode } from "react";

/**
 * Section "Activité récente" — présentationnelle.
 *
 * L'en-tête est commun SANGO/EVM ; le contenu (liste de txs) est
 * fourni par le wrapper (RecentActivity ou HistoryListEvm).
 */
export interface ActivitySectionProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly onRefresh?: () => void;
  readonly isRefreshing?: boolean;
  readonly children: ReactNode;
}

export function ActivitySection({
  title = "Activité récente",
  subtitle,
  onRefresh,
  isRefreshing = false,
  children,
}: ActivitySectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`size-3 ${isRefreshing ? "animate-spin" : ""}`}
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Rafraîchir
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">{children}</div>
    </section>
  );
}
