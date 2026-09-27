/**
 * Helpers de formatage pour l'UI.
 *
 * Règle d'or : tous les montants circulent en **base units** (bigint ou
 * string décimale) dans le code, et ne sont convertis en SANGO qu'au
 * moment de l'affichage.
 */

const BASE_UNITS_PER_SANGO = 10_000_000n;
const SANGO_DECIMALS = 7;

/** Parse une string décimale (base units) en bigint. */
export function parseBaseUnits(s: string): bigint {
  return BigInt(s);
}

/**
 * Convertit des base units en chaîne SANGO lisible.
 *
 * Ex: 1234567890n → "123.4567890"
 */
export function formatSango(baseUnits: string | bigint, decimals = 7): string {
  const v = typeof baseUnits === "string" ? BigInt(baseUnits) : baseUnits;
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const BASE = 10_000_000n;

  const whole = abs / BASE;
  const frac = abs % BASE;

  let out: string;
  if (frac === 0n) {
    out = whole.toString();
  } else {
    const fracStr = frac.toString().padStart(7, "0").slice(0, decimals).replace(/0+$/, "");
    out = fracStr ? `${whole}.${fracStr}` : whole.toString();
  }
  return neg ? `-${out}` : out;
}

/**
 * Parse une chaîne SANGO saisie par l'utilisateur en base units.
 *
 * Accepte "1", "1.5", "1.5000000", "0.0000001".
 * Lance une erreur si le format est invalide ou la précision trop fine.
 */
export function parseSango(s: string): bigint {
  const trimmed = s.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Invalid amount format");
  }
  const negative = trimmed.startsWith("-");
  const raw = negative ? trimmed.slice(1) : trimmed;
  const [wholeStr, fracStr = ""] = raw.split(".");
  if (fracStr.length > SANGO_DECIMALS) {
    throw new Error(`Too many decimals (max ${SANGO_DECIMALS})`);
  }
  const fracPadded = fracStr.padEnd(SANGO_DECIMALS, "0");
  const whole = BigInt(wholeStr || "0");
  const frac = BigInt(fracPadded || "0");
  const v = whole * BASE_UNITS_PER_SANGO + frac;
  return negative ? -v : v;
}

/**
 * Raccourcit une adresse hex pour l'affichage.
 *
 * Ex: "0x02291e07...aa01ab" avec chars=4 → "0x0229…01ab"
 */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 4) return address;
  const prefix = address.startsWith("0x")
    ? address.slice(2, 2 + chars)
    : address.slice(0, chars);
  const suffix = address.slice(-chars);
  return `${address.startsWith("0x") ? "0x" : ""}${prefix}…${suffix}`;
}

/** Raccourcit un hash de tx (même logique). */
export function shortenHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2 + 2) return hash;
  const body = hash.startsWith("0x") ? hash.slice(2) : hash;
  return `0x${body.slice(0, chars)}…${body.slice(-chars)}`;
}
