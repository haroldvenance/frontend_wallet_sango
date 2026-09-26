import { SangoClient } from "@sango/sdk";
import type { Network } from "@sango/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_ENDPOINT, DEFAULT_NETWORK, NETWORK_ENDPOINTS } from "@/lib/config";

interface SdkState {
  /** Instance client active (reconstruite à chaque changement). */
  client: SangoClient;
  /** Endpoint actuellement utilisé (peut être custom). */
  endpoint: string;
  /** Réseau associé (mainnet | testnet) — affecte le HRP Bech32m. */
  network: Network;
  /** URL custom saisie par l'utilisateur, ou null si preset. */
  customEndpoint: string | null;

  setPresetNetwork: (network: Network) => void;
  setCustomEndpoint: (url: string) => void;
  clearCustom: () => void;
}

function makeClient(endpoint: string, network: Network): SangoClient {
  return new SangoClient({ endpoint, network });
}

const isClient = typeof window !== "undefined";

export const useSdkStore = create<SdkState>()(
  persist(
    (set, get) => ({
      client: makeClient(DEFAULT_ENDPOINT, DEFAULT_NETWORK),
      endpoint: DEFAULT_ENDPOINT,
      network: DEFAULT_NETWORK,
      customEndpoint: null,

      setPresetNetwork: (network) => {
        const endpoint = NETWORK_ENDPOINTS[network] || DEFAULT_ENDPOINT;
        set({
          client: makeClient(endpoint, network),
          endpoint,
          network,
          customEndpoint: null,
        });
      },

      setCustomEndpoint: (url) => {
        const { network } = get();
        set({
          client: makeClient(url, network),
          endpoint: url,
          customEndpoint: url,
        });
      },

      clearCustom: () => {
        const { network } = get();
        const endpoint = NETWORK_ENDPOINTS[network] || DEFAULT_ENDPOINT;
        set({
          client: makeClient(endpoint, network),
          endpoint,
          customEndpoint: null,
        });
      },
    }),
    {
      name: "sango-sdk",
      storage: isClient ? createJSONStorage(() => localStorage) : undefined,
      // On ne persiste que le sérialisable.
      partialize: (s) => ({
        endpoint: s.endpoint,
        network: s.network,
        customEndpoint: s.customEndpoint,
      }),
      // Au rehydrate, on reconstruit le client.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<{
          endpoint: string;
          network: Network;
          customEndpoint: string | null;
        }>;
        const endpoint = p.customEndpoint ?? p.endpoint ?? DEFAULT_ENDPOINT;
        const network = p.network ?? DEFAULT_NETWORK;
        return {
          ...current,
          endpoint,
          network,
          customEndpoint: p.customEndpoint ?? null,
          client: makeClient(endpoint, network),
        };
      },
    },
  ),
);
