/**
 * **Phase 13-B** — Chips de filtre réutilisables (EVM + Bitcoin).
 *
 * SANGO a sa propre version inline (avec "staking") — on la laisse
 * telle quelle pour ne pas risquer de régression.
 */
export type HistoryFilter = "all" | "sent" | "received";

interface HistoryFilterChipsProps {
  readonly value: HistoryFilter;
  readonly onChange: (v: HistoryFilter) => void;
  readonly labels: Record<HistoryFilter, string>;
}

export function HistoryFilterChips({
  value,
  onChange,
  labels,
}: HistoryFilterChipsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {(["all", "sent", "received"] as const).map((f) => (
        <button
          key={f}
          type="button"
          data-testid={`history-filter-${f}`}
          onClick={() => onChange(f)}
          className={[
            "rounded-full border px-3 py-1 text-xs transition-colors",
            value === f
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "border-border text-muted-foreground hover:bg-accent",
          ].join(" ")}
        >
          {labels[f]}
        </button>
      ))}
    </div>
  );
}
