import {
  deriveNativeAddress,
  nativeAddressToHex,
  tryDecodeAnyNetwork,
} from "@sango/wallet-core";

import type { AddressProvider } from "../capabilities/address-provider";
import type { AccountRef } from "../types/account";
import type { Address } from "../types/address";
import type { Signer } from "../types/signer";

/**
 * Dérivation d'adresse SANGO native.
 *
 * L'adresse est un Keccak256 tronqué : `Keccak256("SANGO/ADDRESS/V1" ||
 * pk)[0..20]`. Toute la logique cryptographique vit dans
 * `wallet-core` ; ce provider ne fait que l'orchestrer avec le
 * `Signer`.
 */
export class SangoAddressProvider implements AddressProvider {
  readonly #signer: Signer;

  constructor(signer: Signer) {
    this.#signer = signer;
  }

  async deriveAddress(account: AccountRef): Promise<Address> {
    const publicKey = await this.#signer.getPublicKey(account);
    const addressBytes = deriveNativeAddress(publicKey);
    // `nativeAddressToHex` (wallet-core) retourne `string`, mais le
    // format est toujours `0x…` — cast vers le brand Address (D-SESS-12).
    return nativeAddressToHex(addressBytes) as Address;
  }

  validateAddress(address: string): boolean {
    // Forme hex canonique (0x + 40).
    if (/^0x[0-9a-fA-F]{40}$/.test(address)) return true;
    // Forme Bech32m (mainnet ou testnet/devnet).
    try {
      tryDecodeAnyNetwork(address);
      return true;
    } catch {
      return false;
    }
  }
}
