import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { Balance } from "../types/balance";

/**
 * Capacité obligatoire : lire le solde d'un asset pour une adresse.
 */
export interface BalanceProvider {
  getBalance(address: Address, assetRef: AssetRef): Promise<Balance>;
}
