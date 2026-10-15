import { ALL_EVM_NETWORKS, evmNetworkById } from "@sango/wallet-chains";

import { NetworkSelectorBody } from "@/features/network/network-selector-body";
import { useChainNetworkSelector } from "@/features/network/use-chain-network-selector";

import { MainnetWarning } from "./mainnet-warning";

/**
 * Sélecteur de réseau EVM — wrapper mince (Phase 11.3).
 *
 * **Deux modes (D-E2.3-2)** :
 * - **Uncontrolled** : lit `wallet-store.networkId`, écrit via
 *   `setNetworkId`, notifie par toast. Ne s'affiche que pour
 *   `format === "bip39"`.
 * - **Controlled** : `value` fourni par le parent, pas d'écriture
 *   store, pas de toast. Le garde-fou `format === "bip39"` ne
 *   s'applique pas (create/import sans session).
 *
 * **E2.3.a.3 (D-E2.3-3)** : un `MainnetWarning` s'affiche sous le
 * nom du réseau actif si celui-ci est un mainnet EVM. Le bandeau est
 * **spécifique à EVM** — Bitcoin n'en a pas (voir son wrapper).
 *
 * La logique contrôlée/uncontrolled et le rendu commun vivent dans
 * `features/network/`. Ce fichier ne fait que cabler la famille EVM.
 */
interface EvmNetworkSelectorProps {
  readonly value?: string;
  readonly onChange?: (networkId: string) => void;
}

export function EvmNetworkSelector(props: EvmNetworkSelectorProps = {}) {
  const sel = useChainNetworkSelector({
    networks: ALL_EVM_NETWORKS,
    getById: evmNetworkById,
    value: props.value,
    onChange: props.onChange,
    uncontrolledGate: (s) => s.format === "bip39",
  });

  if (!sel.shouldRender) return null;

  return (
    <NetworkSelectorBody
      heading="Réseau EVM"
      testIdPrefix="network"
      networks={sel.visibleNetworks}
      currentId={sel.currentId}
      currentName={sel.currentName}
      onSelect={sel.handleChange}
      warning={
        <MainnetWarning networkId={sel.currentId} className="mt-2" />
      }
    />
  );
}
