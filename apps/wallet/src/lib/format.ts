/**
 * Helpers de formatage monétaire et d'affichage.
 *
 * Règle d'or :
 *   1. Tous les montants circulent en BASE UNITS (bigint / string entière).
 *      La conversion en unité lisible est réservée à l'affichage.
 *   2. Jamais de `number` flottant pour un montant monétaire.
 *   3. `formatSango` TRONQUE (n'arrondit pas) : la valeur affichée ne
 *      surestime JAMAIS le solde réel. Le résultat ne doit JAMAIS être
 *      réutilisé pour calculer, remplir un champ, ou alimenter un MAX.
 *      Pour cela, utiliser directement `baseUnits` (bigint).
 */

export const SANGO_DECIMALS = 7 as const;
export const BASE_UNITS_PER_SANGO = 10_000_000n as const;

/**
 * Parse une string de base units en bigint.
 * Rejette tout format non entier signé ("1.5", "1e7", "0x…").
 */
export function parseBaseUnits(s: string): bigint {
  const trimmed = s.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error("parseBaseUnits: integer string expected");
  }
  return BigInt(trimmed);
}

/**
 * Formate des base units SANGO en string lisible.
 *
 * ⚠️ TRONCATURE (pas d'arrondi) :
 *    formatSango(12_390_000n, 2) → "1.23" (pas "1.24").
 *    Choix délibéré : la valeur affichée ≤ valeur réelle.
 *
 * ⚠️ NE JAMAIS réutiliser la string retournée pour :
 *    - calculer une transaction,
 *    - remplir un champ d'envoi,
 *    - alimenter un bouton MAX.
 *    Utiliser `baseUnits` (bigint) à la place.
 *
 * @param baseUnits    Montant en base units (string entière ou bigint).
 * @param maxDecimals  Décimales affichées, entier dans [0, SANGO_DECIMALS].
 * @throws             Si `maxDecimals` hors bornes.
 */
export function formatSango(
  baseUnits: string | bigint,
  maxDecimals: number = SANGO_DECIMALS,
): string {
  if (
    !Number.isInteger(maxDecimals) ||
    maxDecimals < 0 ||
    maxDecimals > SANGO_DECIMALS
  ) {
    throw new Error(
      `formatSango: maxDecimals must be an integer in [0, ${SANGO_DECIMALS}]`,
    );
  }

  const v =
    typeof baseUnits === "string" ? parseBaseUnits(baseUnits) : baseUnits;
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = abs / BASE_UNITS_PER_SANGO;
  const frac = abs % BASE_UNITS_PER_SANGO;

  if (frac === 0n || maxDecimals === 0) {
    return neg ? `-${whole.toString()}` : whole.toString();
  }

  const fracStr = frac
    .toString()
    .padStart(SANGO_DECIMALS, "0")
    .slice(0, maxDecimals) // troncature explicite (voir JSDoc)
    .replace(/0+$/, "");

  const out = fracStr ? `${whole}.${fracStr}` : whole.toString();
  return neg ? `-${out}` : out;
}

/**
 * Parse une saisie utilisateur en base units SANGO.
 * Rejette notation scientifique, symboles monétaires, espaces internes.
 * Lève si la précision dépasse SANGO_DECIMALS.
 */
export function parseSango(s: string): bigint {
  const trimmed = s.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("parseSango: invalid amount format");
  }
  const negative = trimmed.startsWith("-");
  const raw = negative ? trimmed.slice(1) : trimmed;
  const [wholeStr, fracStr = ""] = raw.split(".");
  if (fracStr.length > SANGO_DECIMALS) {
    throw new Error(`parseSango: too many decimals (max ${SANGO_DECIMALS})`);
  }
  const fracPadded = fracStr.padEnd(SANGO_DECIMALS, "0");
  const whole = BigInt(wholeStr || "0");
  const frac = BigInt(fracPadded || "0");
  const v = whole * BASE_UNITS_PER_SANGO + frac;
  return negative ? -v : v;
}

/**
 * Raccourcit une adresse (préfixe + suffixe significatifs).
 * Préserve `0x` s'il est présent, ne l'invente jamais sinon.
 */
export function shortenAddress(address: string, chars = 4): string {
  const isHex = address.startsWith("0x");
  const body = isHex ? address.slice(2) : address;
  if (body.length <= chars * 2) return address;
  const prefix = isHex ? `0x${body.slice(0, chars)}` : body.slice(0, chars);
  const suffix = body.slice(-chars);
  return `${prefix}…${suffix}`;
}

/**
 * Tronque une chaîne en `prefix…suffix`.
 * Retourne la chaîne telle quelle si elle est déjà courte.
 */
export function truncateMiddle(
  value: string,
  prefix: number,
  suffix: number,
): string {
  if (value.length <= prefix + suffix + 1) return value;
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}

/**
 * Raccourcit un hash de transaction.
 * Préserve `0x` uniquement s'il était présent — un txid Bitcoin
 * (sans `0x`) n'est jamais préfixé par `0x`.
 */
export function shortenHash(hash: string, chars = 6): string {
  const isHex = hash.startsWith("0x");
  const body = isHex ? hash.slice(2) : hash;
  if (body.length <= chars * 2) return hash;
  const prefix = isHex ? `0x${body.slice(0, chars)}` : body.slice(0, chars);
  const suffix = body.slice(-chars);
  return `${prefix}…${suffix}`;
}