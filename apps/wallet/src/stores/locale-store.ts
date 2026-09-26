import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Locale } from "@/i18n";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
}

/**
 * Langue de l'app, persistée dans localStorage.
 *
 * Défaut : `fr` (équipe FR).
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      setLocale: (locale) => set({ locale }),
      toggle: () => set({ locale: get().locale === "fr" ? "en" : "fr" }),
    }),
    { name: "sango-locale" },
  ),
);
