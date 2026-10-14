import { useSearchParams } from "react-router-dom";

import { SendAssetPicker } from "@/features/send/send-asset-picker";
import { isKnownNetworkId, resolveChainFamily } from "@/lib/chain-family";
import { NetworkOverrideProvider } from "@/providers/network-override-context";

import { SendBitcoinRoute } from "./send-bitcoin";
import { SendEvmRoute } from "./send-evm";
import { SangoSendRoute } from "./send-sango";

/**
 * Dispatcher `/send` — Phase 10 (D10-b·A, D10-h·A).
 *
 * **Route canonique** : `/send?network=<networkId>&asset=<assetId>`.
 *
 * **Validation** :
 *   - les deux params sont requis ;
 *   - `networkId` doit être **connu** (`isKnownNetworkId`) ;
 *   - la famille est dérivée via `resolveChainFamily(networkId)`.
 *
 * **En cas de params manquants ou invalides** → `SendAssetPicker`.
 * Aucun throw, aucune erreur bloquante : l'utilisateur revient au
 * point de départ sans perdre le fil.
 *
 * **Override de réseau** : le sous-arbre est enveloppé dans un
 * `NetworkOverrideProvider` avec le réseau dérivé des params. Tous
 * les hooks consommateurs (`useNetworkQueryContext`,
 * `useSendEvm`, `useBitcoinBalance`, `useAccount`…) voient le
 * réseau demandé, indépendamment du réseau actif du store.
 *
 * Le store `useWalletStore.networkId` **n'est jamais modifié**.
 */
export function SendRoute() {
  const [searchParams] = useSearchParams();
  const rawNetwork = searchParams.get("network");
  const rawAsset = searchParams.get("asset");

  // Aucun paramètre → picker.
  if (!rawNetwork || !rawAsset) {
    return <SendAssetPicker />;
  }

  // Paramètres invalides → picker (pas d'erreur bloquante).
  if (!isKnownNetworkId(rawNetwork)) {
    return <SendAssetPicker />;
  }

  const family = resolveChainFamily(rawNetwork);

  return (
    <NetworkOverrideProvider networkId={rawNetwork} family={family}>
      {family === "bitcoin" && <SendBitcoinRoute />}
      {family === "evm" && <SendEvmRoute />}
      {family === "sango" && <SangoSendRoute />}
    </NetworkOverrideProvider>
  );
}
