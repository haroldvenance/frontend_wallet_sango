import { Keyring, type KeyringEntry } from "./keyring";
import {
  decryptBip39Secret,
  decryptWalletSecret,
  reencryptStoredWallet,
  type StoredWallet,
} from "./storage";

/**
 * **Phase 11.2** — Changement du mot de passe du keyring.
 *
 * **Modèle de sécurité** :
 *   1. **Phase 1 (mémoire)** : déchiffrer chaque entrée avec l'ancien
 *      mot de passe, la ré-encrypter avec le nouveau, et vérifier le
 *      round-trip en mémoire. **Aucune écriture** pendant cette phase.
 *   2. **Phase 2 (IDB)** : `Keyring.replaceAll()` — une seule
 *      transaction IndexedDB. Si erreur → IDB rollback, anciennes
 *      entrées intactes.
 *   3. **Phase 3 (vérification post-commit)** : relire le keyring et
 *      déchiffrer chaque entrée avec le nouveau mot de passe.
 *
 * **Distinction critique** : un échec en phase 3 ne signifie **pas**
 * que l'écriture a échoué — l'écriture IDB est déjà commitée. On
 * retourne `status: "warning"` (≠ `"error"`) pour que l'UI informe
 * l'utilisateur sans mentir sur l'état réel.
 */
export interface ChangeKeyringPasswordArgs {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export type ChangeKeyringPasswordError =
  | "empty-keyring"
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

/**
 * Déchiffre n'importe quel format avec le mot de passe donné.
 * Utilisé uniquement pour la vérification post-écriture.
 */
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
  const { currentPassword, newPassword } = args;

  if (newPassword.length < 8) {
    return { status: "error", reason: "invalid-new-password" };
  }
  if (newPassword === currentPassword) {
    return { status: "error", reason: "same-as-current" };
  }

  const kr = await Keyring.open();
  try {
    const existing = await kr.list();
    if (existing.length === 0) {
      return { status: "error", reason: "empty-keyring" };
    }

    // ── Phase 1 : préparation en mémoire (aucune écriture) ───────
    // (a) Déchiffrer TOUTES les entries avec l'ancien mot de passe.
    // (b) Ré-encrypter chacune avec le nouveau.
    // (c) Vérifier par round-trip.
    // Toute erreur ici → retour SANS avoir touché au keyring.
    const updated: KeyringEntry[] = [];
    for (const entry of existing) {
      let newStored: StoredWallet;
      try {
        newStored = await reencryptStoredWallet(
          entry.stored,
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
      // déchiffrable avec le nouveau mot de passe, avant toute
      // écriture.
      try {
        await decryptWith(newStored, newPassword);
      } catch {
        return { status: "error", reason: "reencrypt-failed" };
      }

      updated.push({ ...entry, stored: newStored });
    }

    // ── Phase 2 : écriture atomique ─────────────────────────────
    try {
      await kr.replaceAll(updated);
    } catch {
      // IDB a rollback — anciennes entries intactes.
      return { status: "error", reason: "write-failed" };
    }

    // ── Phase 3 : vérification post-commit ──────────────────────
    // ⚠️ Un échec ici ≠ tx échouée. Les données sont écrites.
    try {
      const fresh = await kr.list();
      if (fresh.length !== updated.length) {
        return {
          status: "warning",
          message:
            "Password changed, but the post-write verification found a count mismatch. Unlock with the new password to confirm.",
        };
      }
      for (const entry of fresh) {
        await decryptWith(entry.stored, newPassword);
      }
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
