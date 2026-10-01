import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Carte hero — présentationnelle uniquement.
 *
 * Affiche le solde de l'asset natif du wallet actif, sans connaître
 * la famille (SANGO ou EVM). Les wrappers `BalanceCard` (SANGO) et
 * `BalanceCardEvm` (EVM) fournissent les données.
 *
 * Le `accent` pilote la teinte des halos (primary/emerald pour SANGO,
 * indigo/violet pour EVM).
 */
export interface HeroAssetCardProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly subtitle: string;
  /** Badge réseau (ex. "SANGO", "BIP-39"). */
  readonly tag?: string;
  readonly balance: string;
  readonly symbol: string;
  /** Ligne fiat optionnelle (composant `<FiatLine />`). */
  readonly fiatLine?: ReactNode;
  /** Pastille adresse + bouton copie. */
  readonly addressPill?: ReactNode;
  /** Ligne secondaire (nonce, pubkey…). */
  readonly footer?: ReactNode;
  /** Bouton "Détail" (optionnel — caché si absent). */
  readonly onDetail?: () => void;
  readonly accent?: "primary" | "indigo";
  /** Zone d'actions (boutons Envoyer / Recevoir / etc.). */
  readonly children?: ReactNode;
}

export function HeroAssetCard({
  icon,
  title,
  subtitle,
  tag,
  balance,
  symbol,
  fiatLine,
  addressPill,
  footer,
  onDetail,
  accent = "primary",
  children,
}: HeroAssetCardProps) {
  const halos =
    accent === "indigo"
      ? {
          a: "bg-indigo-500/15",
          b: "bg-violet-500/10",
          tag: "border-indigo-500/30 bg-indigo-500/10 text-indigo-500",
          dot: "bg-indigo-500",
        }
      : {
          a: "bg-primary/15",
          b: "bg-emerald-500/10",
          tag: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
          dot: "bg-emerald-500",
        };

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div
        className={`pointer-events-none absolute -right-24 -top-24 size-64 rounded-full blur-3xl ${halos.a}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full blur-3xl ${halos.b}`}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {tag && (
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${halos.tag}`}
            >
              {tag}
            </span>
          )}
        </div>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Disponible
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {balance}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {symbol}
              </span>
            </div>

            {onDetail && (
              <button
                type="button"
                onClick={onDetail}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
              >
                <ArrowUpRight className="size-3.5" />
                Détail
              </button>
            )}
          </div>

          {fiatLine && <div className="mt-2 text-sm">{fiatLine}</div>}

          {addressPill && <div className="mt-4">{addressPill}</div>}
        </div>

        {children && (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap">
            {children}
          </div>
        )}

        {footer && (
          <div className="mt-5 text-[11px] text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Pastille adresse réutilisable (SANGO bech32m, EVM 0x…).
 *
 * Le wrapper fournit la valeur brute et le handler de copie.
 */
export interface AddressPillProps {
  readonly display: string;
  readonly copyValue: string;
  readonly onCopy: (value: string, message: string) => void;
  readonly copiedMessage: string;
  readonly accent?: "primary" | "indigo";
}

export function AddressPill({
  display,
  copyValue,
  onCopy,
  copiedMessage,
  accent = "primary",
}: AddressPillProps) {
  const dot = accent === "indigo" ? "bg-indigo-500" : "bg-emerald-500";
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className="font-mono text-xs text-muted-foreground">{display}</span>
      <button
        type="button"
        onClick={() => onCopy(copyValue, copiedMessage)}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Copier l'adresse"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="size-3.5"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>
  );
}
