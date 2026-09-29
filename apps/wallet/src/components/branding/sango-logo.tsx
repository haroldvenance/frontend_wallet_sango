interface Props {
  /** Taille en pixels (carré). Défaut : 48. */
  size?: number;
  /** Classes CSS additionnelles. */
  className?: string;
  /** Désactive l'ombre (utile sur fonds sombres/gradient). */
  flat?: boolean;
}

/**
 * Logo Sango réutilisable.
 *
 * Rend `/sango-logo.svg` (placé dans `public/`).
 * Le SVG doit être carré ; le rendu applique un arrondi doux.
 */
export function SangoLogo({ size = 48, className = "", flat = false }: Props) {
  return (
    <img
      src="/sango-logo.png"
      alt="Sango"
      width={size}
      height={size}
      draggable={false}
      className={[
        "rounded-2xl select-none",
        flat ? "" : "shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
