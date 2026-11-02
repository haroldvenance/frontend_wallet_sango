import { Bip39Wallet, Keyring, Wallet } from "@sango/wallet-core";
import type { WalletFormat } from "@sango/wallet-core";

import type { AnyWallet } from "@/stores/wallet-store";

export interface DecryptedWallet {
  readonly id: string;
  readonly wallet: AnyWallet;
  readonly format: WalletFormat;
  readonly networkId: string;
  readonly label: string;
  readonly createdAt: number;
}

/**
 * Aucun message d'erreur brut n'est exposé. `errorCode` reste
 * non-informatif — il ne distingue pas "mauvais mot de passe" de
 * "blob corrompu" (le format ne le permet pas aujourd'hui, et
 * distinguer ouvrirait une attaque par oracle).
 */
export interface DecryptFailure {
  readonly id: string;
  readonly errorCode: "decryption-failed";
}

export interface DecryptAllResult {
  readonly decrypted: readonly DecryptedWallet[];
  readonly failed: readonly DecryptFailure[];
}

export async function decryptAllWallets(
  password: string,
): Promise<DecryptAllResult> {
  const kr = await Keyring.open();
  try {
    const entries = await kr.list();
    const decrypted: DecryptedWallet[] = [];
    const failed: DecryptFailure[] = [];

    for (const entry of entries) {
      try {
        if (entry.format === "sango-legacy") {
          const w = await Wallet.importEncrypted(entry.stored, password);
          decrypted.push({
            id: entry.id,
            wallet: w,
            format: "sango-legacy",
            networkId: entry.networkId,
            label: entry.label,
            createdAt: entry.createdAt,
          });
        } else {
          const w = await Bip39Wallet.importEncrypted(entry.stored, password);
          decrypted.push({
            id: entry.id,
            wallet: w,
            format: "bip39",
            networkId: entry.networkId,
            label: entry.label,
            createdAt: entry.createdAt,
          });
        }
      } catch {
        // Message volontairement neutre : ne pas transmettre l'erreur
        // crypto (peut révéler un offset, un padding, un tag mismatch).
        failed.push({ id: entry.id, errorCode: "decryption-failed" });
      }
    }

    return { decrypted, failed };
  } finally {
    kr.close();
  }
}