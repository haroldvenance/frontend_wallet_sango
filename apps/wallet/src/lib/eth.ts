import { formatEther, isAddress, parseEther } from "viem";

/**
 * Helpers ETH — wrappers autour de viem pour l'UI.
 *
 * Centralise les conversions wei ↔ ETH et la validation d'adresse
 * pour éviter d'importer viem partout dans les composants.
 */

/**
 * Parse une saisie utilisateur "0.1" (ETH) → bigint wei.
 *
 * @throws si l'entrée est vide, négative, ou mal formée.
 */
export function parseEth(input: string): bigint {
  const trimmed = input.trim().replace(",", ".");
  if (!trimmed) throw new Error("Montant vide");
  if (trimmed.startsWith("-")) throw new Error("Montant négatif");
  return parseEther(trimmed as `${number}`);
}

/**
 * Formate wei → ETH avec un nombre fixe de décimales significatives
 * (utile pour les fees, plus court qu'un `formatEther` complet).
 *
 * Exemple : 210_000_000_000_000 wei → "0.00021"
 */
export function formatEthShort(wei: bigint, maxDecimals = 6): string {
  const full = formatEther(wei);
  if (!full.includes(".")) return full;
  const [whole, frac] = full.split(".");
  const trimmed = frac!.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmed.length === 0 ? whole! : `${whole}.${trimmed}`;
}

/** Vrai si `input` est une adresse EVM valide (0x + 40 hex). */
export function isValidEvmAddress(input: string): boolean {
  return isAddress(input);
}

/**
 * Formate un montant de token en unités humaines (USDC, USDT…).
 *
 * `amount` est en base units (bigint), `decimals` vient du token
 * (USDC/USDT : 6). Retourne par défaut 6 décimales significatives,
 * trimmées des zéros de queue.
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals = 6,
): string {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, maxDecimals);
  const trimmed = fracStr.replace(/0+$/, "");
  return trimmed.length === 0 ? whole.toString() : `${whole}.${trimmed}`;
}

/**
 * Formate un montant de stablecoin en USD conventionnel.
 *
 * **Parité 1 USDC = 1 USDT = $1** — hardcodé, pas d'API externe
 * (D-E1.6-3). L'affichage est indicatif et préfixé `≈` par l'UI.
 */
export function formatStablecoinUsd(
  amount: bigint,
  decimals: number,
): string {
  const base = 10n ** BigInt(decimals);
  const whole = Number(amount / base);
  const frac = Number(amount % base) / Number(base);
  const dollars = whole + frac;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Parse une saisie utilisateur en base units d'un token ERC-20.
 *
 * @param input  "1.5" (string user)
 * @param decimals  decimals du token (6 pour USDC/USDT)
 *
 * Retourne le montant en bigint (base units). Refuse les valeurs
 * négatives, vides ou non-numériques. Trim la partie décimale au
 * nombre de décimales du token (pas d'arrondi).
 */
export function parseTokenAmount(input: string, decimals: number): bigint {
  const trimmed = input.trim().replace(",", ".");
  if (!trimmed) throw new Error("Montant vide");
  if (trimmed.startsWith("-")) throw new Error("Montant négatif");
  if (!/^\d*\.?\d*$/.test(trimmed)) throw new Error("Format invalide");

  const [wholeStr = "", fracStr = ""] = trimmed.split(".");
  const whole = wholeStr === "" ? 0n : BigInt(wholeStr);
  const fracPadded = fracStr.padEnd(decimals, "0").slice(0, decimals);
  const frac = fracPadded === "" ? 0n : BigInt(fracPadded);

  return whole * 10n ** BigInt(decimals) + frac;
}
