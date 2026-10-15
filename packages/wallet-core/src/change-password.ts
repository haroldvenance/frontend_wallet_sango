import { Keyring, type KeyringEntry } from "./keyring";
import {
  decryptBip39Secret,
  decryptWalletSecret,
  reencryptStoredWallet,
  type StoredWallet,
} from "./storage";

/**
 * **Phase 11.2** — Changement du mot de passe d'**un portefeuille**.
 *
 * **Modèle de sécurité** :
 *   - Chaque `KeyringEntry` a **son propre mot de passe**. Il n'existe
 *     pas de mot de passe « global du keyring ».
 *   - Cette fonction ne modifie **que** l'entrée ciblée par
 *     `targetEntryId`. Les autres entries sont laissées intactes.
 *   - Si le user veut changer un autre wallet, il doit d'abord switcher
 *     dessus (le nouveau devient `activeId`) puis rappeler cette
 *     fonction.
 *
 * **Garanties** :
 *   1. **Phase 1 (mémoire)** : déchiffrer, ré-encrypter, round-trip
 *      vérifier. **Aucune écriture** pendant cette phase.
 *   2. **Phase 2 (IDB)** : `Keyring.replaceAll()` — une seule
 *      transaction. Si erreur → rollback, ancien keyring intact.
 *   3. **Phase 3 (post-commit)** : relire et déchiffrer avec le
 *      nouveau mot de passe. Un échec ici → `status: "warning"`
 *      (l'écriture est commitée, ce n'est **pas** un rollback).
 */
export interface ChangeKeyringPasswordArgs {
  readonly currentPassword: string;
  readonly newPassword: string;
  /**
   * ID de l'entrée à ré-encrypter. Typiquement `activeId` du
   * wallet-store. Les autres entries ne sont pas touchées.
   */
  readonly targetEntryId: string;
}

export type ChangeKeyringPasswordError =
  | "entry-not-found"
  | "wrong-current-password"
  | "invalid-new-password"
  | "same-as-current"
  | "reencrypt-failed"
  | "write-failed"
  | "verify-failed";

export type ChangeKeyringPasswordResult =
  | { readonly status: "ok" }
  | { readonly status: "warning"; readonly message: string }
  | { readonly status: "error"; readonly reason: ChangeKeyringPasswordError };

async function decryptWith(
  stored: StoredWallet,
  password: string,
): Promise<void> {
  if (stored.version === 1) {
    await decryptWalletSecret(stored, password);
    return;
  }
  if (stored.version === 2) {
    await decryptBip39Secret(stored, password);
    return;
  }
  throw new Error(
    `decryptWith: unsupported version ${(stored as { version: number }).version}`,
  );
}

export async function changeKeyringPassword(
  args: ChangeKeyringPasswordArgs,
): Promise<ChangeKeyringPasswordResult> {
  const { currentPassword, newPassword, targetEntryId } = args;

  if (newPassword.length < 8) {
    return { status: "error", reason: "invalid-new-password" };
  }
  if (newPassword === currentPassword) {
    return { status: "error", reason: "same-as-current" };
  }

  const kr = await Keyring.open();
  try {
    const existing = await kr.list();
    const target = existing.find((e) => e.id === targetEntryId);
    if (!target) {
      return { status: "error", reason: "entry-not-found" };
    }

    // ── Phase 1 : préparation en mémoire (aucune écriture) ───────
    let newStored: StoredWallet;
    try {
      newStored = await reencryptStoredWallet(
        target.stored,
        currentPassword,
        newPassword,
      );
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "Invalid password or corrupted wallet") {
        return { status: "error", reason: "wrong-current-password" };
      }
      return { status: "error", reason: "reencrypt-failed" };
    }

    // Round-trip en mémoire : prouve que le nouveau blob est
    // déchiffrable avec le nouveau mot de passe.
    try {
      await decryptWith(newStored, newPassword);
    } catch {
      return { status: "error", reason: "reencrypt-failed" };
    }

    // ── Phase 2 : écriture atomique ─────────────────────────────
    // On remplace UNIQUEMENT l'entrée ciblée. Les autres entries
    // sont réécrites telles quelles (no-op fonctionnel) pour
    // bénéficier de la transaction IDB unique.
    const updated: KeyringEntry[] = existing.map((e) =>
      e.id === targetEntryId ? { ...e, stored: newStored } : e,
    );
    try {
      await kr.replaceAll(updated);
    } catch {
      return { status: "error", reason: "write-failed" };
    }

    // ── Phase 3 : vérification post-commit ──────────────────────
    try {
      const fresh = await kr.list();
      const check = fresh.find((e) => e.id === targetEntryId);
      if (!check) {
        return {
          status: "warning",
          message:
            "Password changed, but the post-write verification could not find the entry. Unlock with the new password to confirm.",
        };
      }
      await decryptWith(check.stored, newPassword);
    } catch {
      return {
        status: "warning",
        message:
          "Password changed, but the post-write verification could not complete. Unlock with the new password to confirm.",
      };
    }

    return { status: "ok" };
  } finally {
    kr.close();
  }
}
