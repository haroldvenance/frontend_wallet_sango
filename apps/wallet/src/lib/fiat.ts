/**
 * Conversion indicative SANGO → EUR → XAF.
 *
 * ⚠️ Ce module est une **configuration produit du frontend**.
 *    Le taux n'a aucune valeur économique, ne fait pas partie du
 *    protocole, et ne doit jamais apparaître dans le consensus.
 *
 * Spec V1 (figée) :
 *  - 1 SANGO = 0,01 € (configurable via VITE_SANGO_EUR_RATE)
 *  - 1 EUR   = 655.957 XAF (parité fixe internationale)
 *  - Affichage : opt-in strict (voir preferences-store.ts)
 *  - EUR : 2 décimales · XAF : 0 décimale
 *  - Aucun appel réseau, aucun envoi de solde à un tiers
 */

const BASE_UNITS_PER_SANGO = 10_000_000n;

/** Parité fixe EUR → XAF (traité international, ne jamais modifier). */
export const XAF_PER_EUR = 655.957;

/** Taux configuré (0 = fiat désactivé côté build). */
const ENV_RATE = import.meta.env.VITE_SANGO_EUR_RATE;
export const SANGO_EUR_RATE: number =
  typeof ENV_RATE === "string" ? Number.parseFloat(ENV_RATE) : 0;

/** Vrai si le build expose un taux fiat valide. */
export function isFiatAvailable(): boolean {
  return Number.isFinite(SANGO_EUR_RATE) && SANGO_EUR_RATE > 0;
}

function baseUnitsToNumber(baseUnits: string | bigint): number {
  const v = typeof baseUnits === "string" ? BigInt(baseUnits) : baseUnits;
  // Conversion Number : précision acceptable pour un affichage indicatif.
  const whole = Number(v / BASE_UNITS_PER_SANGO);
  const frac = Number(v % BASE_UNITS_PER_SANGO) / 1e7;
  return whole + frac;
}

export interface FiatValue {
  readonly eur: number;
  readonly xaf: number;
}

/**
 * Convertit des base units en { eur, xaf }.
 * Renvoie `null` si le fiat est désactivé (VITE_SANGO_EUR_RATE absent).
 */
export function fiatFromBaseUnits(
  baseUnits: string | bigint,
): FiatValue | null {
  if (!isFiatAvailable()) return null;
  const sango = baseUnitsToNumber(baseUnits);
  const eur = sango * SANGO_EUR_RATE;
  const xaf = eur * XAF_PER_EUR;
  return { eur, xaf };
}

/** Formate un montant EUR (2 décimales, locale FR). */
export function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(v);
}

/** Formate un montant XAF (0 décimale, locale FR). */
export function formatXaf(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(v);
}

/** Libellé standard — toujours "≈ valeur indicative". */
export const FIAT_LABEL = "≈ valeur indicative";
