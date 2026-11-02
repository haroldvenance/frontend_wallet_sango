import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const AUTO_LOCK_OPTIONS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
] as const;

export type AutoLockMs = (typeof AUTO_LOCK_OPTIONS_MS)[number];

export const DEFAULT_AUTO_LOCK_MS: AutoLockMs = 15 * 60 * 1000;

/** Nom du slot localStorage. Utilisé par DangerZone pour ne PAS
 *  vider des clés qui n'appartiennent pas à Sango. */
export const PREFERENCES_STORAGE_KEY = "sango.preferences.v1";

import type { FiatCurrency } from "@/lib/fiat";
export type { FiatCurrency } from "@/lib/fiat";
export { FIAT_CURRENCIES } from "@/lib/fiat";

interface PreferencesState {
  showFiat: boolean;
  setShowFiat: (v: boolean) => void;
  fiatCurrency: FiatCurrency;
  setFiatCurrency: (v: FiatCurrency) => void;
  autoLockMs: number;
  setAutoLockMs: (v: number) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  incomingNotificationsEnabled: boolean;
  setIncomingNotificationsEnabled: (v: boolean) => void;
  systemNotificationsEnabled: boolean;
  setSystemNotificationsEnabled: (v: boolean) => void;
  backupReminderDismissed: boolean;
  setBackupReminderDismissed: (v: boolean) => void;
}

/**
 * Préférences utilisateur persistées (localStorage).
 *
 * `version: 1` — permet d'implémenter des migrations futures sans
 * casser les stores existants (Zustand `persist` appelle
 * `migrate` si la version stockée diffère).
 *
 * **Ce store ne contient AUCUN secret** — uniquement des booléens,
 * enums et timings. Safe à lire côté client à tout moment.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      showFiat: false,
      setShowFiat: (v) => set({ showFiat: v }),

      fiatCurrency: "EUR",
      setFiatCurrency: (v) => set({ fiatCurrency: v }),

      autoLockMs: DEFAULT_AUTO_LOCK_MS,
      setAutoLockMs: (v) => set({ autoLockMs: v }),

      notificationsEnabled: true,
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),

      incomingNotificationsEnabled: true,
      setIncomingNotificationsEnabled: (v) =>
        set({ incomingNotificationsEnabled: v }),

      systemNotificationsEnabled: false,
      setSystemNotificationsEnabled: (v) =>
        set({ systemNotificationsEnabled: v }),

      backupReminderDismissed: false,
      setBackupReminderDismissed: (v) =>
        set({ backupReminderDismissed: v }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Migrate : à compléter quand on passe à version 2.
      migrate: (persisted, fromVersion) => persisted as PreferencesState,
    },
  ),
);