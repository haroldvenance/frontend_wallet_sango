import { deriveEthereumAddress } from "@sango/wallet-core";

import type { AddressProvider } from "../capabilities/address-provider";
import type { AccountRef } from "../types/account";
import type { Address } from "../types/address";
import type { Signer } from "../types/signer";

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

/**
 * Dérivation d'adresse Ethereum.
 *
 * L'adresse est `keccak256(publicKey[1..65])[12..32]`, calculée dans
 * `wallet-core` (`deriveEthereumAddress`). Ce provider ne fait que
 * l'orchestrer avec le `Signer`.
 *
 * **Contrat du Signer EVM** : `signer.getPublicKey(account)` DOIT
 * retourner la clé publique **non-compressée** (65 bytes, préfixe
 * 0x04). Le `MultiCurveSigner` (patch 5) garantit ce format pour
 * `family === "evm"`. Un Signer mal configuré lève une erreur claire.
 */
export class EvmAddressProvider implements AddressProvider {
  readonly #signer: Signer;

  constructor(signer: Signer) {
    this.#signer = signer;
  }

  async deriveAddress(account: AccountRef): Promise<Address> {
    const publicKey = await this.#signer.getPublicKey(account);
    if (publicKey.length !== 65) {
      throw new Error(
        `EvmAddressProvider: signer.getPublicKey() must return 65 bytes (uncompressed, 0x04-prefixed) for EVM, got ${publicKey.length}`,
      );
    }
    if (publicKey[0] !== 0x04) {
      throw new Error(
        "EvmAddressProvider: uncompressed public key must start with 0x04",
      );
    }
    const addressBytes = deriveEthereumAddress(publicKey);
    return bytesToHex(addressBytes) as Address;
  }

  validateAddress(address: string): boolean {
    // D-EVM-1 : validation de format uniquement (0x + 40 hex).
    // EIP-55 (checksum case-sensitive) est un contrôle d'affichage,
    // pas une condition d'acceptation — une adresse lowercase est
    // valide. Un helper formatEip55() sera ajouté en patch 5 si
    // l'UI en a besoin.
    return EVM_ADDRESS_REGEX.test(address);
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
