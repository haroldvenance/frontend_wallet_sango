import { useSearchParams } from "react-router-dom";

import { SendAssetPicker } from "@/features/send/send-asset-picker";
import { isKnownNetworkId, resolveChainFamily } from "@/lib/chain-family";
import { NetworkOverrideProvider } from "@/providers/network-override-context";

import { SendBitcoinRoute } from "./send-bitcoin";
import { SendEvmRoute } from "./send-evm";
import { SangoSendRoute } from "./send-sango";

/**
 * Dispatcher `/send` — `/send?network=<networkId>&asset=<assetId>`.
 *
 * - Params manquants ou invalides → `SendAssetPicker`.
 * - Chaque route fille reçoit une `key` dérivée du réseau : changer
 *   le réseau via l'URL force un remontage propre (state local reset,
 *   pas de token « fantôme » d'un autre réseau).
 */
export function SendRoute() {
  const [searchParams] = useSearchParams();
  const rawNetwork = searchParams.get("network");
  const rawAsset = searchParams.get("asset");

  if (!rawNetwork || !rawAsset) return <SendAssetPicker />;
  if (!isKnownNetworkId(rawNetwork)) return <SendAssetPicker />;

  const family = resolveChainFamily(rawNetwork);

  return (
    <NetworkOverrideProvider networkId={rawNetwork} family={family}>
      {family === "bitcoin" && (
        <SendBitcoinRoute key={`btc-${rawNetwork}`} />
      )}
      {family === "evm" && <SendEvmRoute key={`evm-${rawNetwork}`} />}
      {family === "sango" && <SangoSendRoute key={`sango-${rawNetwork}`} />}
    </NetworkOverrideProvider>
  );
}