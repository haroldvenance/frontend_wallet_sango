import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AuthShell } from "@/components/branding/auth-shell";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Picker "Importer un portefeuille" — Phase 3.4 (D19·A).
 *
 * Trois choix → routes dédiées :
 *   SANGO   → /import-sango
 *   EVM     → /import-evm
 *   Bitcoin → /import-bitcoin
 *
 * Pas de logique métier ici : c'est un simple aiguillage UI.
 */
export function ImportPicker() {
  const navigate = useNavigate();
  const t = useTranslation();

  const choices = [
    {
      id: "sango" as const,
      testId: "import-choice-sango",
      title: t.importPicker.sango.title,
      description: t.importPicker.sango.description,
      route: "/import-sango",
    },
    {
      id: "evm" as const,
      testId: "import-choice-evm",
      title: t.importPicker.evm.title,
      description: t.importPicker.evm.description,
      route: "/import-evm",
    },
    {
      id: "bitcoin" as const,
      testId: "import-choice-bitcoin",
      title: t.importPicker.bitcoin.title,
      description: t.importPicker.bitcoin.description,
      route: "/import-bitcoin",
    },
  ];

  return (
    <AuthShell
      title={t.importPicker.title}
      subtitle={t.importPicker.subtitle}
      backTo="/welcome"
      logoSize={56}
    >
      <div className="mt-6 space-y-3">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            data-testid={c.testId}
            onClick={() => navigate(c.route)}
            className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{c.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {c.description}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </AuthShell>
  );
}
