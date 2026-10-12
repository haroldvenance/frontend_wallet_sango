interface Props {
  /** Taille en pixels (carré). Défaut : 32. */
  size?: number;
  /** Classes CSS additionnelles. */
  className?: string;
}

/**
 * **Phase 5.6** — ce composant est **absorbé** par `<AssetLogo
 * assetId="sango" />`. Conservé car `AssetLogo` l'utilise en interne
 * (pas de duplication du PNG) ; les nouveaux consommateurs doivent
 * passer par `AssetLogo`.
 *
 * Icône du coin natif Sango — utilisée partout où on mentionne SANGO.
 *
 * Plus petite que `<SangoLogo>` (pensée pour une liste, un header de
 * formulaire, une tx row).
 *
 * Usage :
 *   <SangoCoinIcon />              // 32px
 *   <SangoCoinIcon size={20} />    // 20px inline dans du texte
 */
export function SangoCoinIcon({ size = 32, className = "" }: Props) {
  return (
    <img
      src="/sango-logo.png"
      alt="SANGO"
      width={size}
      height={size}
      draggable={false}
      className={["rounded-full select-none", className].join(" ")}
    />
  );
}
