import type { ChainFamily } from "@sango/wallet-chains";
import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * **Phase 10** — Contexte React qui surcharge le réseau « effectif »
 * pendant la durée d'un sous-arbre (typiquement le form `/send`).
 *
 * **Objectif** : permettre à l'utilisateur d'envoyer un actif sur
 * **n'importe quel réseau** supporté, sans modifier le réseau actif du
 * store (`useWalletStore.networkId`). Le dashboard reste sur son réseau
 * courant ; seul le form Send opère dans le contexte override.
 *
 * **Contrat strict** (D10-a) :
 *   - `useNetworkQueryContext()` lit l'override s'il existe ;
 *   - tous les hooks d'envoi (`useSendEvm`, `useSendBitcoin`,
 *     `useSendTx`) et de lecture (`useEvmAccount`, `useEvmTokens`,
 *     `useBitcoinBalance`, `useBitcoinFeeRates`, `useAccount`) passent
 *     par `useNetworkQueryContext` → l'override propage le réseau
 *     cohérent à **toute la chaîne** : balance, frais, construction,
 *     signature, broadcast ;
 *   - le réseau du store **n'est jamais touché** ;
 *   - l'override disparaît dès qu'on quitte le sous-arbre.
 *
 * **Hors périmètre** : ce contexte n'est **pas** persisté, il vit
 * uniquement dans le rendu React. Aucun composant extérieur au
 * sous-arbre ne peut le voir.
 */
export interface NetworkOverride {
  readonly networkId: string;
  readonly family: ChainFamily;
}

export const NetworkOverrideContext =
  createContext<NetworkOverride | null>(null);

export function useNetworkOverride(): NetworkOverride | null {
  return useContext(NetworkOverrideContext);
}

interface ProviderProps {
  readonly networkId: string;
  readonly family: ChainFamily;
  readonly children: ReactNode;
}

export function NetworkOverrideProvider({
  networkId,
  family,
  children,
}: ProviderProps) {
  const value = useMemo<NetworkOverride>(
    () => ({ networkId, family }),
    [networkId, family],
  );
  return (
    <NetworkOverrideContext.Provider value={value}>
      {children}
    </NetworkOverrideContext.Provider>
  );
}
