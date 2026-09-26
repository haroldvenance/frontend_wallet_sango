import { useLocaleStore } from "@/stores/locale-store";

import { getTranslations, type TranslationSchema } from "./index";

/**
 * Hook principal pour accéder aux traductions.
 *
 * Usage :
 *   const t = useTranslation();
 *   <h1>{t.dashboard.title}</h1>
 *
 * Le hook retourne l'objet complet typé. Aucune interpolation pour l'instant
 * — on en ajoutera si besoin (ex : `t.send.available.replace("{n}", n)`).
 */
export function useTranslation(): TranslationSchema {
  const locale = useLocaleStore((s) => s.locale);
  return getTranslations(locale);
}
