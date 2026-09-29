import { fiatFromBaseUnits, formatEur, formatXaf, FIAT_LABEL } from "@/lib/fiat";
import { usePreferencesStore } from "@/stores/preferences-store";

interface Props {
  baseUnits: string | bigint;
  /** Variante d'affichage. */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Ligne fiat conditionnelle.
 *
 * Rend `null` si `showFiat === false` OU si le taux n'est pas configuré.
 * Aucun fallback, aucun tooltip — opt-in strict.
 */
export function FiatLine({ baseUnits, variant = "full", className = "" }: Props) {
  const showFiat = usePreferencesStore((s) => s.showFiat);
  if (!showFiat) return null;

  const fiat = fiatFromBaseUnits(baseUnits);
  if (!fiat) return null;

  const eur = formatEur(fiat.eur);
  const xaf = formatXaf(fiat.xaf);

  if (variant === "compact") {
    return (
      <span className={["text-muted-foreground", className].join(" ")}>
        ({eur})
      </span>
    );
  }

  return (
    <span className={["text-muted-foreground", className].join(" ")}>
      {FIAT_LABEL} {eur} · {xaf}
    </span>
  );
}
