import {
  ALL_BITCOIN_NETWORKS,
  bitcoinNetworkById,
} from "@sango/wallet-chains";

import { NetworkSelectorBody } from "@/features/network/network-selector-body";
import { useChainNetworkSelector } from "@/features/network/use-chain-network-selector";

/**
 * Sélecteur de réseau Bitcoin — wrapper mince (Phase 11.3).
 *
 * **Deux modes** (symétriques d'`EvmNetworkSelector`) :
 * - **Uncontrolled** : lit `wallet-store.networkId`, écrit via
 *   `setNetworkId`, notifie par toast. Ne s'affiche que pour
 *   `family === "bitcoin"`.
 * - **Controlled** : `value` fourni par le parent, pas d'écriture
 *   store, pas de toast.
 *
 * **Garde-fou cross-family** : `wallet-store.setNetworkId` refuse tout
 * `networkId` dont la famille diffère du réseau courant (D-E2.1-23).
 * Un composant Bitcoin ne peut donc pas accidentellement switcher
 * vers un réseau EVM.
 *
 * **Pas de `MainnetWarning`** ici — le bandeau « fonds réels » est
 * réservé aux mainnets EVM dans cette app. Bitcoin mainnet n'a pas de
 * bandeau dans le sélecteur (l'avertissement apparaît dans les flows
 * Send Bitcoin via `send-bitcoin.tsx`).
 */
interface BitcoinNetworkSelectorProps {
  readonly value?: string;
  readonly onChange?: (networkId: string) => void;
}

export function BitcoinNetworkSelector(
  props: BitcoinNetworkSelectorProps = {},
) {
  const sel = useChainNetworkSelector({
    networks: ALL_BITCOIN_NETWORKS,
    getById: bitcoinNetworkById,
    value: props.value,
    onChange: props.onChange,
    uncontrolledGate: (s) => s.family === "bitcoin",
  });

  if (!sel.shouldRender) return null;

  return (
    <NetworkSelectorBody
      heading="Réseau Bitcoin"
      testIdPrefix="bitcoin-network"
      networks={sel.visibleNetworks}
      currentId={sel.currentId}
      currentName={sel.currentName}
      onSelect={sel.handleChange}
    />
  );
}
