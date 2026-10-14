import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { AssetLogo } from "@/components/branding/asset-logo";
import { NetworkLogo } from "@/components/branding/network-logo";

/**
 * Enveloppe visuelle commune aux 3 routes Send — Phase 10.2.
 *
 * Structure :
 *   - Header : bouton Retour + logo asset + titre + réseau + badge réseau.
 *   - `balanceCard` : carte "Solde disponible" premium (gradient + halos).
 *   - `children` : formulaire (champs spécifiques famille).
 *
 * **Périmètre** : présentation pure. Ne connaît ni le réseau ni la
 * famille — les routes consommatrices fournissent `assetId` et
 * `networkId` pour les logos.
 */
interface SendShellProps {
  readonly assetId: string;
  readonly networkId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly balanceCard: ReactNode;
  readonly children: ReactNode;
}

export function SendShell({
  assetId,
  networkId,
  title,
  subtitle,
  balanceCard,
  children,
}: SendShellProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/");
        }}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour
      </button>

      {/* Header — contexte visuel immédiat */}
      <header className="mt-6 flex items-center gap-4">
        <div className="relative shrink-0">
          <AssetLogo assetId={assetId} size={56} />
          <div className="absolute -bottom-1 -right-1 rounded-full bg-card p-0.5 ring-2 ring-card">
            <NetworkLogo networkId={networkId} size={22} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </header>

      <div className="mt-6">{balanceCard}</div>

      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

// ── Balance card (premium) ─────────────────────────────────

interface SendBalanceCardProps {
  readonly assetId: string;
  readonly balance: string;
  readonly symbol: string;
  readonly fiat?: string;
}

export function SendBalanceCard({
  assetId,
  balance,
  symbol,
  fiat,
}: SendBalanceCardProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/3 size-40 rounded-full bg-emerald-500/[0.08] blur-3xl"
      />

      <div className="relative">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Solde disponible
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {balance}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {symbol}
          </span>
        </div>

        {fiat && (
          <p className="mt-1.5 text-xs text-muted-foreground">{fiat}</p>
        )}
      </div>

      {/* Logo fantôme à droite pour l'identité */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-4 -right-4 opacity-[0.06]"
      >
        <AssetLogo assetId={assetId} size={120} />
      </div>
    </section>
  );
}

// ── Field primitives ────────────────────────────────────────

interface SendFieldProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: string;
}

export function SendField({ label, children, hint, error }: SendFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {hint && !error && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-[11px] text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

// ── Submit ──────────────────────────────────────────────────

interface SendSubmitProps {
  readonly label: string;
  readonly pending: boolean;
  readonly pendingLabel: string;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly assetId?: string;
}

export function SendSubmit({
  label,
  pending,
  pendingLabel,
  disabled,
  icon,
  assetId,
}: SendSubmitProps) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {icon}
      {assetId && (
        <AssetLogo assetId={assetId} size={20} />
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}
