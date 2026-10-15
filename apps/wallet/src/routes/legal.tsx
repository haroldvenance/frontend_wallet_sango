import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";

/**
 * Pages légales statiques — Phase 11.
 *
 * Stubs pour `/legal/terms` et `/legal/privacy`. Le contenu réel sera
 * rédigé ultérieurement (avocat / conformité). Ces pages existent pour
 * que les liens dans Settings ne soient pas morts.
 */
export function LegalRoute() {
  const { doc } = useParams<{ doc: string }>();
  const t = useTranslation();

  const isTerms = doc === "terms";
  const title = isTerms
    ? t.settings.legal.termsTitle
    : t.settings.legal.privacyTitle;
  const body = isTerms
    ? t.settings.legal.termsBody
    : t.settings.legal.privacyBody;
  const Icon = isTerms ? FileText : ShieldCheck;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t.settings.legal.back}
      </Link>

      <header className="mt-6 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </header>

      <div className="mt-6 rounded-2xl border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
        <p>{body}</p>
        <p className="mt-4 text-xs">
          {t.settings.legal.wip}
        </p>
      </div>
    </div>
  );
}
