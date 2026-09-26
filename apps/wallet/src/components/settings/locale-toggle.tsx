import { Languages } from "lucide-react";

import { useTranslation } from "@/i18n/use-translation";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * Bouton de bascule FR ↔ EN.
 *
 * Affiche le code de la langue ACTIVE ("FR" ou "EN") — l'utilisateur
 * comprend qu'en cliquant il change.
 */
export function LocaleToggle() {
  const { locale, toggle } = useLocaleStore();
  const t = useTranslation();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.locale.switch}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Languages className="size-4" />
      <span className="uppercase">{locale}</span>
    </button>
  );
}
