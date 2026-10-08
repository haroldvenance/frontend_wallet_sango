/**
 * Icône brand Sango — marqueur rond.
 *
 * Distinct de `SangoCoinIcon` (utilisé dans les listes d'assets pour
 * représenter la pièce SANGO) : `SangoIcon` est l'icône **brand** du
 * wallet, utilisée dans les en-têtes, cards de bienvenue, écrans
 * succès, wallet identicons.
 *
 * Rend `/sango-logo.png` dans un conteneur rond (`rounded-full`).
 */
interface SangoIconProps {
  readonly size?: number;
  readonly className?: string;
}

export function SangoIcon({ size = 32, className = "" }: SangoIconProps) {
  return (
    <img
      src="/sango-logo.png"
      alt="Sango"
      width={size}
      height={size}
      draggable={false}
      className={["rounded-full select-none", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
