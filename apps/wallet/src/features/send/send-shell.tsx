import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { AssetLogo } from "@/components/branding/asset-logo";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Enveloppe visuelle commune aux 3 routes Send — Phase 7 (D7-c·A).
 *
 * Structure :
 *   - Header : back link + titre + sous-titre.
 *   - Optionnel : `SendBalanceCard` (solde disponible).
 *   - Slot `children` : les champs du formulaire (spécifiques famille).
 *
 * **Périmètre** : présentation pure. Ne connaît ni le réseau ni la
 * famille — les routes consommatrices fournissent tout par props.
 */
interface SendShellProps {
  readonly title: string;
  readonly subtitle: string;
  readonly balanceCard?: ReactNode;
  readonly children: ReactNode;
}

export function SendShell({
  title,
  subtitle,
  balanceCard,
  children,
}: SendShellProps) {
  const navigate = useNavigate();
  const t = useTranslation();
  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-6">
      {/* **Phase 10.1** — Retour à la page précédente. Fallback sur
          `/` si l'historique est vide (lien direct, bookmark). */}
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate("/");
          }
        }}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t.send.shell.back}
      </button>

      <header className="mt-6">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </header>

      {balanceCard && <div className="mt-6">{balanceCard}</div>}

      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

// ── Balance card ────────────────────────────────────────────

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
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
      <AssetLogo assetId={assetId} size={44} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Solde disponible
        </p>
        <p className="mt-0.5 text-lg font-semibold tracking-tight">
          {balance}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {symbol}
          </span>
        </p>
        {fiat && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{fiat}</p>
        )}
      </div>
    </div>
  );
}

// ── Field primitives ────────────────────────────────────────

interface SendFieldProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly hint?: ReactNode;
}

export function SendField({ label, children, hint }: SendFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[11px] text-muted-foreground">
          {hint}
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
}

export function SendSubmit({
  label,
  pending,
  pendingLabel,
  disabled,
  icon,
}: SendSubmitProps) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {icon}
      {pending ? pendingLabel : label}
    </button>
  );
}
