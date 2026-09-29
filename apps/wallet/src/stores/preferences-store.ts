import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface PreferencesState {
  /** Affiche les montants fiat à côté des montants SANGO. */
  showFiat: boolean;
  setShowFiat: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      showFiat: false,
      setShowFiat: (v) => set({ showFiat: v }),
    }),
    {
      name: "sango.preferences.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
