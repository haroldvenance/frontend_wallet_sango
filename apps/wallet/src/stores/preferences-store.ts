import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Préférences utilisateur persistées (localStorage).
 *
 * - `showFiat`   : affichage € / XAF indicatif à côté des montants.
 * - `autoLockMs` : délai d'inactivité avant verrouillage automatique
 *                  (E2.5.e). Valeurs proposées : 5 / 15 / 30 / 60 min.
 *
 * **Migration** : Zustand `persist` fait un merge shallow de l'état
 * persisté sur l'état courant. Les anciens utilisateurs sans
 * `autoLockMs` dans leur localStorage hériteront du défaut (15 min)
 * sans migration manuelle.
 */

export const AUTO_LOCK_OPTIONS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
] as const;

export type AutoLockMs = (typeof AUTO_LOCK_OPTIONS_MS)[number];

export const DEFAULT_AUTO_LOCK_MS: AutoLockMs = 15 * 60 * 1000;

interface PreferencesState {
  /** Affiche les montants fiat à côté des montants SANGO. */
  showFiat: boolean;
  setShowFiat: (v: boolean) => void;

  /** Délai d'inactivité avant verrouillage (ms). */
  autoLockMs: number;
  setAutoLockMs: (v: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      showFiat: false,
      setShowFiat: (v) => set({ showFiat: v }),

      autoLockMs: DEFAULT_AUTO_LOCK_MS,
      setAutoLockMs: (v) => set({ autoLockMs: v }),
    }),
    {
      name: "sango.preferences.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
