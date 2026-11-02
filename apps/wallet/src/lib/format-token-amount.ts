/**
 * **Phase 12-D-A** — Formatage compact d'un montant de token.
 *
 * Digit count adaptatif :
 *   - abs < 1   : 6 décimales
 *   - abs < 100 : 4 décimales
 *   - sinon     : 2 décimales
 *
 * ⚠️ P2 : locale hardcodée `fr-FR`. À brancher sur la préférence
 * utilisateur (`useLocale`) quand l'app exposera un hook de locale
 * courant. En attendant, `undefined` laisse le navigateur décider,
 * ce qui donne un résultat cohérent avec le reste de l'app sur
 * navigateur FR.
 */
export function formatTokenAmount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs < 1 ? 6 : abs < 100 ? 4 : 2;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}