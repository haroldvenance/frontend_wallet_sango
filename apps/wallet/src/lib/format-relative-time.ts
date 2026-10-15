/**
 * **Phase 13-D** — Classification d'un timestamp en unité relative.
 *
 * Fonction pure testable. Ne dépend ni de React ni d'i18n — le
 * rendu localisé se fait côté composant.
 *
 * **Seuils** :
 *   - delta <  30 s  → "now"
 *   - delta <  60 s  → "seconds"
 *   - delta <  60 m  → "minutes"
 *   - delta <  24 h  → "hours"
 *   - delta <   7 j  → "days"
 *   - delta ≥   7 j  → "absolute" (l'appelant rend une date)
 *
 * **Timestamp futur** (delta négatif, clock skew) → "now". On ne
 * veut jamais afficher "dans 3 secondes" pour un événement passé.
 */
const RELATIVE_THRESHOLD_DAYS = 7;

export type RelativeTime =
  | { readonly kind: "now" }
  | { readonly kind: "seconds"; readonly value: number }
  | { readonly kind: "minutes"; readonly value: number }
  | { readonly kind: "hours"; readonly value: number }
  | { readonly kind: "days"; readonly value: number }
  | { readonly kind: "absolute"; readonly seconds: number };

export function classifyRelativeTime(
  timestampSeconds: number,
  nowMs: number = Date.now(),
): RelativeTime {
  const deltaSec = Math.floor(nowMs / 1000 - timestampSeconds);

  if (deltaSec < 30) return { kind: "now" };
  if (deltaSec < 60) return { kind: "seconds", value: deltaSec };
  if (deltaSec < 3600)
    return { kind: "minutes", value: Math.floor(deltaSec / 60) };
  if (deltaSec < 86400)
    return { kind: "hours", value: Math.floor(deltaSec / 3600) };

  const days = Math.floor(deltaSec / 86400);
  if (days < RELATIVE_THRESHOLD_DAYS) return { kind: "days", value: days };
  return { kind: "absolute", seconds: timestampSeconds };
}
