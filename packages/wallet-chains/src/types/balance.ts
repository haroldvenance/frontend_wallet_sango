import type { AssetId } from "./asset";

/**
 * Solde d'un asset sur un réseau, en unité de base.
 *
 * `amount` est en base units (bigint). `decimals` permet à l'UI de
 * formater.
 */
export interface Balance {
  readonly assetId: AssetId;
  readonly networkId: string;
  readonly amount: bigint;
  readonly decimals: number;
}
