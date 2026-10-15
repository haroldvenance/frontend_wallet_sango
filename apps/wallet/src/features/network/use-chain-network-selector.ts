import type { Network } from "@sango/wallet-chains";
import { toast } from "sonner";

import { SHOW_TESTNETS } from "@/lib/env-flags";
import { useWalletStore, type WalletState } from "@/stores/wallet-store";

/**
 * **Phase 11.3** — Hook partagé par `EvmNetworkSelector` et
 * `BitcoinNetworkSelector`.
 *
 * Centralise la logique **commune** :
 *   - mode controlled/uncontrolled (D-E2.3-2) ;
 *   - gate "afficher ou pas" en uncontrolled (dépend de la famille) ;
 *   - filtrage `SHOW_TESTNETS` ;
 *   - écriture store + toast succès en uncontrolled.
 *
 * Ne contient **aucun JSX** — le rendu est dans
 * `NetworkSelectorBody`. Le wrapper EVM ajoute `MainnetWarning` en
 * slot ; le wrapper Bitcoin non.
 */
export interface UseChainNetworkSelectorArgs {
  /** Réseaux de la famille (`ALL_EVM_NETWORKS` ou `ALL_BITCOIN_NETWORKS`). */
  readonly networks: readonly Network[];
  /** Lookup par id (`evmNetworkById` ou `bitcoinNetworkById`). */
  readonly getById: (id: string) => Network | undefined;
  /** Controlled si défini. Sinon, lit le store. */
  readonly value?: string;
  /** Controlled : notifié au changement (le wrapper décide quoi en faire). */
  readonly onChange?: (id: string) => void;
  /**
   * Uncontrolled uniquement : si false, `shouldRender === false`. Le
   * prédicat lit l'état du store (ex. `format === "bip39"` pour EVM,
   * `family === "bitcoin"` pour Bitcoin).
   */
  readonly uncontrolledGate: (state: WalletState) => boolean;
}

export interface UseChainNetworkSelectorResult {
  readonly shouldRender: boolean;
  readonly currentId: string;
  readonly currentName: string;
  readonly visibleNetworks: readonly Network[];
  readonly handleChange: (next: string) => void;
}

export function useChainNetworkSelector(
  args: UseChainNetworkSelectorArgs,
): UseChainNetworkSelectorResult {
  const storeNetworkId = useWalletStore((s) => s.networkId);
  const storeSetNetworkId = useWalletStore((s) => s.setNetworkId);
  const gateOpen = useWalletStore(args.uncontrolledGate);

  const isControlled = args.value !== undefined;
  const shouldRender = isControlled || gateOpen;
  const currentId = isControlled ? args.value! : storeNetworkId;
  const currentName = args.getById(currentId)?.name ?? currentId;

  const visibleNetworks = SHOW_TESTNETS
    ? args.networks
    : args.networks.filter((n) => !n.isTestnet);

  function handleChange(next: string) {
    if (next === currentId) return;

    if (isControlled) {
      args.onChange?.(next);
      return;
    }

    storeSetNetworkId(next);
    const target = args.getById(next);
    toast.success(`Réseau changé : ${target?.name ?? next}`);
  }

  return {
    shouldRender,
    currentId,
    currentName,
    visibleNetworks,
    handleChange,
  };
}
