/**
 * Store Zustand du SDK SANGO haut niveau (`SangoClient`).
 *
 * ⚠️ V0.1 — migration partielle vers WalletSession.
 *
 * Ce store est encore **actif** pour 5 catégories d'usages. Ne PAS
 * supprimer tant que ces cas n'ont pas migré (V0.2+).
 *
 * 1. Métadonnées réseau SANGO-spécifiques (D-SESS-6) :
 *      - hooks/use-chain-info.ts        (height, validators, version)
 *      - hooks/use-recent-blocks.ts     (blocs EVM via eth_*)
 *
 *    Ces primitives n'ont pas d'équivalent multi-chaîne et n'ont pas
 *    leur place dans WalletSession (account-centric).
 *
 * 2. Historique détaillé (D-SESS-9) :
 *      - hooks/use-transactions.ts      (Tx[] : txKind, nonce, gas,
 *                                        signature, pagination offset)
 *      - routes/history.tsx
 *      - routes/history-detail.tsx      (transaction viewer)
 *
 *    HistoryItem (session) ne couvre pas ces champs SANGO-spécifiques.
 *
 * 3. Staking / validateurs (V0.2 — pas encore migré) :
 *      - hooks/use-validators.ts
 *      - hooks/use-staking-actions.tsx  (bond, delegate, claimRewards,
 *                                        unjail, updateCommission — tous
 *                                        via les méthodes dédiées du
 *                                        SangoClient, pas client.send)
 *      - hooks/use-my-delegations.ts
 *
 *    V0.2 : étendre WalletSession avec un `StakingProvider` puis
 *    migrer.
 *
 * 4. Polling d'inclusion de tx (D-SESS-7 — reste sur SDK) :
 *      - hooks/use-send-tx.tsx          (client.waitForInclusion)
 *      - hooks/use-faucet.tsx           (client.waitForInclusion)
 *
 *    `waitForInclusion` est un observer réseau (détection de rejets
 *    silencieux via streak `notFound`), pas une action wallet.
 *
 * 5. Configuration réseau (lecture seule : network, endpoint) :
 *      - hooks/use-network-query-context.ts (endpoint)
 *      - providers/wallet-session-provider.tsx (endpoint)
 *      - components/settings/network-selector.tsx (network)
 *      - routes/create-wallet.tsx, import-wallet.tsx, unlock.tsx
 *
 * Le `client` reste la source de vérité pour ces primitives. Toutes
 * les **actions wallet universelles** (solde, envoi, signature) sont
 * passées à WalletSession (use-account, use-send-tx).
 *
 * ⚠️ `client.send()` (SDK high-level) n'est **plus appelé** depuis
 *    V0.1. Il est conservé sur le SangoClient pour compat, mais aucun
 *    code applicatif ne l'utilise.
 *
 * Voir docs/design/v0-architecture.md (§10 décisions D-SESS-*).
 */

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
