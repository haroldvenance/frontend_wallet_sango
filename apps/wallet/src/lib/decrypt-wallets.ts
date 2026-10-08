import { Bip39Wallet, Keyring, Wallet } from "@sango/wallet-core";
import type { WalletFormat } from "@sango/wallet-core";

import type { AnyWallet } from "@/stores/wallet-store";

/**
 * Déchiffre **toutes** les entrées du keyring avec un password
 * (Phase 3.1, D-Phase3-1).
 *
 * Sémantique "session keyring" : un `unlock(password)` réussit si **au
 * moins une** entrée se déchiffre. Les entrées qui échouent (password
 * différent, blob corrompu) sont **collectées** mais ne bloquent pas
 * la session. L'appelant décide si `decrypted.length === 0` équivaut
 * à un mauvais password.
 *
 * Le password n'est **jamais** conservé en mémoire par cette fonction.
 * Le résultat contient des instances `Wallet`/`Bip39Wallet`
 * déverrouillées (runtime-only, jamais persistées).
 *
 * ⚠️ Ne pas confondre "mauvais password" et "blob corrompu" : les deux
 * produisent une entrée dans `failed`, avec le message d'erreur. Un
 * futur patch pourra les distinguer si le format du blob le permet.
 */

export interface DecryptedWallet {
  readonly id: string;
  readonly wallet: AnyWallet;
  readonly format: WalletFormat;
  readonly networkId: string;
  readonly label: string;
  readonly createdAt: number;
}

export interface DecryptFailure {
  readonly id: string;
  readonly error: string;
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
      } catch (e) {
        failed.push({
          id: entry.id,
          error: (e as Error).message,
        });
      }
    }

    return { decrypted, failed };
  } finally {
    kr.close();
  }
}
