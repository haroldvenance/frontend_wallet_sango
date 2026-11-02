import { AlertTriangle, ArrowLeft, Download, FileCheck2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { SettingsModal } from "@/components/settings/settings-modal";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page "Phrase de récupération".
 *
 * La mnemonic n'est JAMAIS persistée (invariant D-HD-1). Cette page
 * explique et fournit :
 *   1. L'export du keyfile chiffré (seed dérivé, PAS la mnemonic).
 *   2. Un lien vers `/settings/recovery-phrase/verify-keyfile`.
 *
 * ⚠️ TODO refactor : le bouton "Exporter" ouvre `SettingsModal` en
 * onglet "wallet" — un composant legacy de 500+ lignes. À remplacer
 * par un `KeyfileDialog` autonome quand le legacy sera déprécié.
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
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="size-3" />
        {t.settings.recoveryPhrase.backButton}
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        {t.settings.recoveryPhrase.title}
      </h1>

      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {t.settings.recoveryPhrase.intro}
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {formatHint}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold">
          {t.settings.recoveryPhrase.keyfileTitle}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t.settings.recoveryPhrase.keyfileBody}
        </p>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{t.settings.recoveryPhrase.keyfileWarning}</span>
        </div>

        <button
          type="button"
          onClick={() => setKeyfileOpen(true)}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Download className="size-4" />
          {t.settings.recoveryPhrase.exportButton}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCheck2 className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {t.settings.recoveryPhrase.verifyTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t.settings.recoveryPhrase.verifyBody}
            </p>
          </div>
        </div>

        <Link
          to="/settings/recovery-phrase/verify-keyfile"
          data-testid="verify-keyfile-link"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {t.settings.recoveryPhrase.verifyButton}
        </Link>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>{t.settings.recoveryPhrase.footerWarning}</span>
      </div>

      <SettingsModal
        open={keyfileOpen}
        onClose={() => setKeyfileOpen(false)}
        initialTab="wallet"
      />
    </div>
  );
}