import { en, type TranslationSchema } from "./locales/en";
import { fr } from "./locales/fr";

export type Locale = "en" | "fr";

const locales: Record<Locale, TranslationSchema> = { en, fr };

export function getTranslations(locale: Locale): TranslationSchema {
  return locales[locale] ?? en;
}

export type { TranslationSchema };
export { en, fr };
