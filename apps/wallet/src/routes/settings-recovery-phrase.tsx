import { AlertTriangle, ArrowLeft, Download, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { SettingsModal } from "@/components/settings/settings-modal";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page "Phrase de récupération" — E2.5.e.
 *
 * Route explicative : la phrase n'est **jamais** stockée (invariant
 * D-HD-1). Le seul backup possible est le keyfile chiffré, qui
 * contient le seed chiffré avec le mot de passe utilisateur.
 *
 * Cette page ne fait qu'**expliquer** et fournir un accès direct à
 * l'export du keyfile (via la modale Wallet).
 */
export function SettingsRecoveryPhraseRoute() {
  const t = useTranslation();
  const format = useWalletStore((s) => s.format);
  const [keyfileOpen, setKeyfileOpen] = useState(false);

  const formatHint =
    format === "sango-legacy"
      ? t.settings.recoveryPhrase.formatSango
      : t.settings.recoveryPhrase.formatBip39;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {t.settings.recoveryPhrase.backButton}
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        {t.settings.recoveryPhrase.title}
      </h1>

      {/* Explanation card */}
      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {t.settings.recoveryPhrase.intro}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t.settings.recoveryPhrase.explanation}
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {formatHint}
            </p>
          </div>
        </div>
      </div>

      {/* Backup card */}
      <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold">
          {t.settings.recoveryPhrase.backupTitle}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t.settings.recoveryPhrase.backupDescription}
        </p>

        <button
          type="button"
          onClick={() => setKeyfileOpen(true)}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Download className="size-4" />
          {t.settings.recoveryPhrase.exportButton}
        </button>
      </div>

      {/* Warning footer */}
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Ne partage jamais le keyfile ni ton mot de passe. Quiconque les
          possède contrôle ton wallet.
        </span>
      </div>

      <SettingsModal
        open={keyfileOpen}
        onClose={() => setKeyfileOpen(false)}
        initialTab="wallet"
      />
    </div>
  );
}
