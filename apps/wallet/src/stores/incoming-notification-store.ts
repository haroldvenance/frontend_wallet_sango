import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * **Phase 12-D-A** — Notifications d'entrées détectées (badge + liste).
 *
 * **Séparé de `incoming-tx-store`** :
 *   - `incoming-tx-store.seenKeys` = dédup silencieuse (empêche
 *     de notifier deux fois la même tx).
 *   - `incoming-notification-store.entries` = liste des entrées
 *     affichables (badge, dropdown), avec état lu/non-lu.
 *
 * Ouvrir la cloche ou "tout marquer comme lu" ne touche JAMAIS
 * `seenKeys`.
 */
const MAX_ENTRIES = 100;
const PERSIST_KEY = "sango.incoming-notification.v1";
const isClient = typeof window !== "undefined";

export interface IncomingNotification {
  readonly key: string;
  readonly networkId: string;
  readonly txHash: string;
  readonly symbol: string;
  readonly amount: number | null;
  readonly counterparty: string | null;
  readonly status: "confirmed" | "pending" | "failed";
  /** Timestamp local (ms epoch) — pas de la blockchain. */
  readonly detectedAt: number;
  readonly read: boolean;
}

interface IncomingNotificationState {
  entries: readonly IncomingNotification[];
  /** Ajoute des entrées (dédup par `key`, FIFO max 100). */
  add: (items: readonly IncomingNotification[]) => void;
  /** Marque toutes les entrées comme lues. */
  markAllRead: () => void;
  /** Vide entièrement (utile pour reset). */
  clear: () => void;
}

export const useIncomingNotificationStore =
  create<IncomingNotificationState>()(
    persist(
      (set) => ({
        entries: [],

        add: (items) => {
          if (items.length === 0) return;
          set((s) => {
            const existingKeys = new Set(s.entries.map((e) => e.key));
            const fresh = items.filter((i) => !existingKeys.has(i.key));
            if (fresh.length === 0) return s;
            const merged = [...s.entries, ...fresh];
            const trimmed =
              merged.length > MAX_ENTRIES
                ? merged.slice(-MAX_ENTRIES)
                : merged;
            return { entries: trimmed };
          });
        },

        markAllRead: () =>
          set((s) => ({
            entries: s.entries.map((e) =>
              e.read ? e : { ...e, read: true },
            ),
          })),

        clear: () => set({ entries: [] }),
      }),
      {
        name: PERSIST_KEY,
        storage: isClient
          ? createJSONStorage(() => localStorage)
          : undefined,
        partialize: (s) => ({ entries: s.entries }),
      },
    ),
  );

/** Sélecteur : nombre d'entrées non lues. */
export function selectUnreadCount(
  state: IncomingNotificationState,
): number {
  let n = 0;
  for (const e of state.entries) if (!e.read) n++;
  return n;
}
