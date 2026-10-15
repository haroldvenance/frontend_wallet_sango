import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * **Phase 12-A** — Configuration RPC EVM custom (par réseau).
 *
 * **Séparation stricte** : le registre `Network` reste immuable
 * (`defaultRpcEndpoints` en lecture seule). Les endpoints custom
 * vivent ici, en surcouche.
 *
 * **Granularité** : un endpoint par `networkId`. Un RPC configuré
 * pour Ethereum ne fuit jamais vers Base ou BSC.
 *
 * **Persistance** : localStorage `sango.evm-rpc.v1`. Non-sensible
 * par défaut — mais une URL peut contenir une clé API. Cf.
 * `lib/redact-url.ts` pour les logs.
 *
 * **Invalidation** : un changement ici déclenche la reconstruction
 * de la `WalletSession` (via `wallet-session-provider`) et le
 * renouvellement des query keys React Query (via
 * `use-network-query-context` + `use-evm-history`).
 */
interface EvmRpcState {
  /** Map `networkId → custom URL`. Absent = preset. */
  customEndpoints: Record<string, string>;

  setCustomEndpoint: (networkId: string, url: string) => void;
  clearCustomEndpoint: (networkId: string) => void;
}

const PERSIST_KEY = "sango.evm-rpc.v1";
const isClient = typeof window !== "undefined";

export const useEvmRpcStore = create<EvmRpcState>()(
  persist(
    (set) => ({
      customEndpoints: {},

      setCustomEndpoint: (networkId, url) =>
        set((s) => ({
          customEndpoints: { ...s.customEndpoints, [networkId]: url },
        })),

      clearCustomEndpoint: (networkId) =>
        set((s) => {
          const next = { ...s.customEndpoints };
          delete next[networkId];
          return { customEndpoints: next };
        }),
    }),
    {
      name: PERSIST_KEY,
      storage: isClient
        ? createJSONStorage(() => localStorage)
        : undefined,
      partialize: (s) => ({ customEndpoints: s.customEndpoints }),
    },
  ),
);
