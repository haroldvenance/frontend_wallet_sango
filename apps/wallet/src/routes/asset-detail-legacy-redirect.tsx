import { Navigate, useParams } from "react-router-dom";

/**
 * Redirect legacy `/asset/:assetId` → `/asset/:networkId/:assetId`.
 *
 * **Phase 9.4** — conserve la compatibilité des liens externes
 * (mockups, bookmarks, communications). Le mapping est **figé** et
 * déterministe : pas d'ambiguïté possible.
 *
 * Mapping :
 *   - `sango` → `sango-devnet`
 *   - `btc`   → `bitcoin-mainnet`
 *   - `eth`   → `ethereum-mainnet`
 *   - `bnb`   → `bsc`
 *   - `usdc`  → `ethereum-mainnet` (USDC natif Circle)
 *   - `usdt`  → `ethereum-mainnet` (USDT Tether)
 *   - autre   → `ethereum-mainnet` (fallback neutre, l'asset
 *               detail affichera "introuvable" si inconnu)
 *
 * ⚠️ Ce redirect ne fait **pas** de résolution dynamique via le
 * réseau actif — c'est intentionnel. Un assetId seul ne peut pas
 * lever l'ambiguïté (deux USDT sur deux réseaux).
 */
const LEGACY_ASSET_TO_NETWORK: Record<string, string> = {
  sango: "sango-devnet",
  btc: "bitcoin-mainnet",
  eth: "ethereum-mainnet",
  bnb: "bsc",
  usdc: "ethereum-mainnet",
  usdt: "ethereum-mainnet",
};

export function AssetDetailLegacyRedirect() {
  const { assetId } = useParams<{ assetId: string }>();
  const lower = (assetId ?? "").toLowerCase();
  const networkId = LEGACY_ASSET_TO_NETWORK[lower] ?? "ethereum-mainnet";

  return <Navigate to={`/asset/${networkId}/${lower}`} replace />;
}
