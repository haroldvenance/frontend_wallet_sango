import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Préférences utilisateur persistées (localStorage).
 *
 * - `showFiat`           : affichage fiat indicatif à côté des montants.
 * - `fiatCurrency`       : devise affichée (EUR / USD / XAF).
 * - `autoLockMs`         : délai d'inactivité avant verrouillage (E2.5.e).
 * - `notificationsEnabled`: affichage des toasts de succès/info (les
 *                          erreurs sont toujours affichées).
 * - `backupReminderDismissed` : masque le rappel de sauvegarde.
 *
 * **Migration** : Zustand `persist` fait un merge shallow. Les anciens
 * utilisateurs sans ces clés héritent des défauts sans migration.
 */

export const AUTO_LOCK_OPTIONS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
] as const;

export type AutoLockMs = (typeof AUTO_LOCK_OPTIONS_MS)[number];

export const DEFAULT_AUTO_LOCK_MS: AutoLockMs = 15 * 60 * 1000;

// **Phase 11.3** — `FiatCurrency` et `FIAT_CURRENCIES` sont définis
// dans `lib/fiat.ts` (source de vérité, couche utilitaire). Re-exportés
// ici pour compatibilité des consommateurs existants.
import type { FiatCurrency } from "@/lib/fiat";
export type { FiatCurrency } from "@/lib/fiat";
export { FIAT_CURRENCIES } from "@/lib/fiat";

interface PreferencesState {
  /** Affiche les montants fiat à côté des montants SANGO. */
  showFiat: boolean;
  setShowFiat: (v: boolean) => void;

  /** Devise affichée pour l'estimation fiat. */
  fiatCurrency: FiatCurrency;
  setFiatCurrency: (v: FiatCurrency) => void;

  /** Délai d'inactivité avant verrouillage (ms). */
  autoLockMs: number;
  setAutoLockMs: (v: number) => void;

  /** Affiche les toasts de succès et d'info (jamais les erreurs). */
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;

  /** Rappel de sauvegarde masqué par l'utilisateur. */
  backupReminderDismissed: boolean;
  setBackupReminderDismissed: (v: boolean) => void;
}

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

      backupReminderDismissed: false,
      setBackupReminderDismissed: (v) =>
        set({ backupReminderDismissed: v }),
    }),
    {
      name: "sango.preferences.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
