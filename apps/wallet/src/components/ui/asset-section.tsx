import { Database } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Section "Cryptos" — présentationnelle uniquement.
 *
 * Affiche une liste d'assets (1 seul en UX-1 : l'asset natif du
 * wallet actif). Prêt pour D8 : la liste pourra accueillir plusieurs
 * items sans refonte.
 */
export interface AssetItem {
  readonly id: string;
  readonly icon: ReactNode;
  readonly symbol: string;
  readonly name: string;
  readonly balance: string;
  readonly fiat?: string;
  readonly badges?: ReactNode[];
}

export interface AssetSectionProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly countLabel?: string;
  readonly items: readonly AssetItem[];
  readonly loading?: boolean;
  readonly emptyMessage?: string;
  readonly footer?: ReactNode;
}

export function AssetSection({
  title,
  subtitle,
  countLabel,
  items,
  loading = false,
  emptyMessage = "Aucun actif.",
  footer,
}: AssetSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {countLabel && (
          <span className="text-xs text-muted-foreground">{countLabel}</span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading && items.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Chargement…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={item.id}
            className={[
              "flex items-center justify-between gap-4 p-4 sm:p-5",
              index !== items.length - 1 ? "border-b" : "",
            ].join(" ")}
          >
            <div className="flex min-w-0 items-center gap-3">
              {item.icon}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.symbol}</p>
                  {item.badges?.map((b, i) => (
                    <span key={i}>{b}</span>
                  ))}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.name}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-mono text-sm font-medium">
                {item.balance}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  {item.symbol}
                </span>
              </p>
              {item.fiat && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.fiat}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {footer && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Database className="size-3.5" />
          <span>{footer}</span>
        </div>
      )}
    </section>
  );
}
