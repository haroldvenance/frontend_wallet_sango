import { decodeBitcoinP2WPKHAddress } from "@sango/wallet-core";
import type { BitcoinNetwork } from "@sango/wallet-core";

/**
 * Helpers Bitcoin — E2.1.b.6.2 / E2.1.b.6.3.
 *
 * Conversions sats ↔ BTC (8 décimales), formatage UI, validation
 * d'adresse P2WPKH stricte.
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

/**
 * Validation **stricte P2WPKH** d'une adresse Bitcoin (E2.1.b.6.3).
 *
 * Utilise `decodeBitcoinP2WPKHAddress` (wallet-core) qui effectue
 * une validation bech32 complète :
 *   - checksum bech32 (rejet si invalide)
 *   - HRP `bc` (mainnet) ou `tb` (testnet)
 *   - witness version 0
 *   - programme de 20 bytes exactement (donc 42 chars)
 *
 * Rejette :
 *   - `tb1q…` avec mauvais checksum
 *   - `tb1q…` sur mainnet (network mismatch)
 *   - `bc1q…` sur testnet (network mismatch)
 *   - P2WSH 62 chars (programme 32 bytes)
 *   - Legacy `1…` / `3…` (non-bech32)
 *   - EVM `0x…`
 *
 * **Périmètre** : uniquement P2WPKH (BIP-84). Les autres formats
 * Bitcoin (P2TR bech32m, P2SH-P2WPKH) sont hors scope tant qu'ils
 * ne sont pas dans le registre.
 */
export function isValidBitcoinAddress(
  address: string,
  expectedNetwork: BitcoinNetwork,
): boolean {
  if (typeof address !== "string" || address.length === 0) return false;
  // Filtre rapide : bech32 lowercase uniquement (BIP-173).
  if (address !== address.toLowerCase()) return false;

  try {
    const decoded = decodeBitcoinP2WPKHAddress(address);
    return decoded.network === expectedNetwork;
  } catch {
    return false;
  }
}
