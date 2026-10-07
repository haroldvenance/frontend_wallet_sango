/**
 * Helpers Bitcoin — E2.1.b.6.2.
 *
 * Conversions sats ↔ BTC (8 décimales) et formatage pour l'UI.
 * Aucune dépendance à viem ou @scure/btc-signer : ce sont des
 * opérations purement arithmétiques sur bigint.
 */

const SATS_PER_BTC = 100_000_000n;
const BTC_DECIMALS = 8;

/**
 * Formate un montant en satoshis vers une chaîne BTC.
 *
 * - Trim les zéros de queue.
 * - `0n` → "0"
 * - `1n` → "0.00000001"
 * - `100_000_000n` → "1"
 *
 * @param sats Montant en satoshis (bigint).
 * @param maxDecimals Nombre max de décimales affichées (défaut 8).
 */
export function formatBitcoin(sats: bigint, maxDecimals = BTC_DECIMALS): string {
  const negative = sats < 0n;
  const abs = negative ? -sats : sats;
  const whole = abs / SATS_PER_BTC;
  const frac = abs % SATS_PER_BTC;

  let out: string;
  if (frac === 0n) {
    out = whole.toString();
  } else {
    const fracStr = frac
      .toString()
      .padStart(BTC_DECIMALS, "0")
      .slice(0, maxDecimals)
      .replace(/0+$/, "");
    out = fracStr ? `${whole}.${fracStr}` : whole.toString();
  }
  return negative ? `-${out}` : out;
}

/**
 * Parse une saisie utilisateur "0.5" (BTC) → satoshis.
 *
 * Accepte `.` ou `,` comme séparateur décimal, trim les espaces.
 * Refuse : vide, négatif, format invalide, plus de 8 décimales.
 */
export function parseBitcoin(input: string): bigint {
  const trimmed = input.trim().replace(",", ".");
  if (!trimmed) throw new Error("Montant vide");
  if (trimmed.startsWith("-")) throw new Error("Montant négatif");
  if (!/^\d*\.?\d*$/.test(trimmed)) throw new Error("Format invalide");

  const [wholeStr = "", fracStr = ""] = trimmed.split(".");
  if (fracStr.length > BTC_DECIMALS) {
    throw new Error(`Trop de décimales (max ${BTC_DECIMALS})`);
  }

  const whole = wholeStr === "" ? 0n : BigInt(wholeStr);
  const fracPadded = fracStr.padEnd(BTC_DECIMALS, "0");
  const frac = fracPadded === "" ? 0n : BigInt(fracPadded);

  return whole * SATS_PER_BTC + frac;
}
