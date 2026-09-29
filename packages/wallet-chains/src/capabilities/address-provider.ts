import type { AccountRef } from "../types/account";
import type { Address } from "../types/address";

/**
 * Capacité obligatoire : dériver une adresse pour un compte donné.
 *
 * La clé publique est obtenue via le `Signer` passé au constructeur
 * de l'adaptateur. Le provider ne reçoit jamais la mnemonic.
 *
 * **Convention V0** : `deriveAddress` retourne la forme **hex**
 * (`0x…`, 20 bytes). C'est le format canonique attendu par le RPC.
 * La forme Bech32m est une projection d'affichage, produite par le
 * helper `encodeNativeAddress` de wallet-core.
 */
export interface AddressProvider {
  deriveAddress(account: AccountRef): Promise<Address>;
  validateAddress(address: string): boolean;
}
