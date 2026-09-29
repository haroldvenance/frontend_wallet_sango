import type { Wallet } from "@sango/wallet-core";
import type { Signer } from "@sango/wallet-chains";

/**
 * Adapte un `Wallet` (wallet-core) en `Signer` (wallet-chains).
 *
 * En V0, il n'y a qu'un wallet déverrouillé à la fois, donc le
 * paramètre `account` est ignoré — on signe toujours avec le wallet
 * courant. En V0.2 (multi-comptes HD), le signer devra router selon
 * `account.accountIndex`.
 */
export function signerFromWallet(wallet: Wallet): Signer {
  return {
    async getPublicKey(): Promise<Uint8Array> {
      return wallet.identity.publicKey;
    },
    async signDomain(
      domain: Uint8Array,
      payload: Uint8Array,
    ): Promise<Uint8Array> {
      return wallet.signDomain(domain, payload);
    },
  };
}
