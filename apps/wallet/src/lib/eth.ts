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
