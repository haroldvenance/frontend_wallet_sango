import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * **Phase 12-C** — Suivi des tx déjà vues pour la détection
 * d'entrantes.
 *
 * **Schema V1** : FIFO par `networkId`, max 50 hashes. Clé V1
 * `${networkId}:${txHash}` — unique en single-wallet. Multi-wallet
 * ajoutera l'adresse (Phase 12-D).
 *
 * **Bootstrap** : `undefined` pour un `networkId` = jamais chargé.
 * Le provider doit alors marquer les txs présentes SANS notifier.
 */
const MAX_PER_NETWORK = 50;
const PERSIST_KEY = "sango.incoming-tx.v1";
const isClient = typeof window !== "undefined";

interface IncomingTxState {
  seenKeys: Record<string, readonly string[]>;
  markSeen: (networkId: string, keys: readonly string[]) => void;
}

export const useIncomingTxStore = create<IncomingTxState>()(
  persist(
    (set) => ({
      seenKeys: {},

      markSeen: (networkId, keys) => {
        if (keys.length === 0) return;
        set((s) => {
          const existing = s.seenKeys[networkId] ?? [];
          const merged = [...existing, ...keys];
          const trimmed =
            merged.length > MAX_PER_NETWORK
              ? merged.slice(-MAX_PER_NETWORK)
              : merged;
          return { seenKeys: { ...s.seenKeys, [networkId]: trimmed } };
        });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: isClient
        ? createJSONStorage(() => localStorage)
        : undefined,
      partialize: (s) => ({ seenKeys: s.seenKeys }),
    },
  ),
);
