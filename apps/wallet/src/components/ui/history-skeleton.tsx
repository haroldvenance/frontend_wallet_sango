/**
 * **Phase 13-B** — Skeleton de chargement pour les listes d'historique.
 *
 * Remplace le texte brut "Chargement…" par des rows fantômes qui
 * matchent la forme finale (icône + 2 lignes + montant).
 */
interface HistorySkeletonProps {
  readonly rows?: number;
}

export function HistorySkeleton({ rows = 5 }: HistorySkeletonProps) {
  return (
    <div data-testid="history-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
        >
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="shrink-0 space-y-1.5">
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-2.5 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
