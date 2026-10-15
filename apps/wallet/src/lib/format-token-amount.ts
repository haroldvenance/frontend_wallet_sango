/**
 * **Phase 12-D-A** — Formatage compact d'un montant de token pour
 * l'affichage UI (badge, dropdown, notif système).
 *
 * Digit count adaptatif :
 *   - abs < 1   : 6 décimales
 *   - abs < 100 : 4 décimales
 *   - sinon     : 2 décimales
 *
 * Locale FR pour cohérence avec le reste de l'app.
 */
export function formatTokenAmount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs < 1 ? 6 : abs < 100 ? 4 : 2;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}
