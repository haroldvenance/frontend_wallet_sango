import { AssetLogo } from "./asset-logo";

/**
 * Logo d'un réseau — Phase 5.6 (D5.6-d·A).
 *
 * **Réutilise `AssetLogo`** : le logo d'un réseau est le logo de son
 * actif natif. ETH pour Ethereum/Base/Arbitrum, BNB pour BNB Chain,
 * BTC pour Bitcoin, SANGO pour Sango.
 *
 * **Limite assumée** : Ethereum, Base et Arbitrum partagent le logo
 * ETH. Un futur composant `NetworkLogo` officiel pourra distinguer
 * ces réseaux si l'UX l'exige (D5.6-d, note).
 */

interface NetworkLogoProps {
  readonly networkId: string;
  readonly size?: number;
  readonly className?: string;
}

/** Mapping networkId → assetId natif. */
function nativeAssetOf(networkId: string): string {
  if (networkId.startsWith("bitcoin-")) return "btc";
  if (networkId.startsWith("sango-")) return "sango";
  if (networkId === "bsc" || networkId === "bsc-testnet") return "bnb";
  // EVM par défaut : eth
  return "eth";
}

export function NetworkLogo({
  networkId,
  size = 20,
  className = "",
}: NetworkLogoProps) {
  return (
    <AssetLogo
      assetId={nativeAssetOf(networkId)}
      size={size}
      className={className}
    />
  );
}
