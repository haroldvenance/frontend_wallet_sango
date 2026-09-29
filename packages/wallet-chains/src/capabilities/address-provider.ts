import type { AccountRef } from "../types/account";
import type { Address } from "../types/address";

/**
 * Capacité obligatoire : dériver une adresse pour un compte donné.
 *
 * La clé publique est obtenue via le `Signer` passé au constructeur
 * de l'adaptateur. Le provider ne reçoit jamais la mnemonic.
 */
export interface AddressProvider {
  deriveAddress(account: AccountRef): Promise<Address>;
  validateAddress(address: string): boolean;
}
