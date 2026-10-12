import { SangoCoinIcon } from "./sango-coin-icon";
import { BnbLogo } from "./logos/bnb";
import { BtcLogo } from "./logos/btc";
import { EthLogo } from "./logos/eth";
import { UsdcLogo } from "./logos/usdc";
import { UsdtLogo } from "./logos/usdt";

/**
 * Logo unifié d'un asset — Phase 5.6.
 *
 * **D5.6-c·A** — un seul point d'entrée pour tous les logos :
 *   - ETH, BTC, BNB, USDC, USDT : SVG inline (vectoriel, themable).
 *   - SANGO : conserve son PNG brand (`/sango-logo.png`).
 *   - Asset inconnu : fallback pastille colorée + 4 premiers
 *     caractères du symbole (comportement historique préservé).
 *
 * **D5.6-f·A** — fond transparent : les logos SVG portent leur propre
 * cercle coloré (bleu/orange/jaune/vert), pas de wrapper CSS. SANGO
 * garde son PNG avec `rounded-full`.
 *
 * **Périmètre** — composant présentationnel pur. Aucune connaissance
 * du réseau, du wallet ou du solde. Le mapping `assetId → composant`
 * est figé ; les tokens inconnus passent par le fallback.
 */

interface AssetLogoProps {
  /**
   * Identifiant canonique de l'asset (`eth`, `btc`, `bnb`, `sango`,
   * `usdc`, `usdt`). Case-insensitive : `"USDT"` et `"usdt"` sont
   * équivalents.
   */
  readonly assetId: string;
  /**
   * Taille en pixels. Défaut : 40.
   *   - `32` → compact (sélecteurs, lignes serrées)
   *   - `40` → standard (asset-list, hero)
   *   - `56` → large (écrans succès, onboarding)
   */
  readonly size?: number;
  /**
   * Symbole affiché si l'asset est inconnu (fallback pastille).
   * Si omis, le fallback affiche les 4 premiers caractères de
   * `assetId` en majuscules.
   */
  readonly fallbackSymbol?: string;
  readonly className?: string;
}

export function AssetLogo({
  assetId,
  size = 40,
  fallbackSymbol,
  className = "",
}: AssetLogoProps) {
  const key = assetId.toLowerCase();

  switch (key) {
    case "eth":
      return <span className={className}><EthLogo size={size} /></span>;
    case "btc":
      return <span className={className}><BtcLogo size={size} /></span>;
    case "bnb":
      return <span className={className}><BnbLogo size={size} /></span>;
    case "usdc":
      return <span className={className}><UsdcLogo size={size} /></span>;
    case "usdt":
      return <span className={className}><UsdtLogo size={size} /></span>;
    case "sango":
      return (
        <span className={className}>
          <SangoCoinIcon size={size} />
        </span>
      );
    default: {
      // Fallback : pastille verte + symbole tronqué.
      const label = (fallbackSymbol ?? assetId).slice(0, 4).toUpperCase();
      const dim = size;
      const fontPx = Math.max(9, Math.round(size * 0.28));
      return (
        <span
          className={className}
          style={{
            display: "inline-flex",
            width: dim,
            height: dim,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.12)",
            color: "rgb(5 150 105)",
            fontWeight: 600,
            fontSize: fontPx,
          }}
          aria-label={label}
        >
          {label}
        </span>
      );
    }
  }
}
