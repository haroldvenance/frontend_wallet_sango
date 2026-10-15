import { toast } from "sonner";

import { usePreferencesStore } from "@/stores/preferences-store";

/**
 * **Phase 11** — Wrapper de toasts gaté sur la préférence
 * `notificationsEnabled`.
 *
 * **Règle de sécurité** : les toasts de **succès / info / warning**
 * sont gatés. Les toasts d'**erreur** sont **toujours affichés** —
 * l'utilisateur ne doit jamais rater une erreur.
 *
 * Migration progressive : les hooks Send/Approve/Staking passent par
 * `notify.*` ; les autres composants peuvent continuer à utiliser
 * `toast` directement (le toggle n'affecte que `notify`).
 */
type ToastOptions = Parameters<typeof toast.success>[1];

function isEnabled(): boolean {
  return usePreferencesStore.getState().notificationsEnabled;
}

function isIncomingEnabled(): boolean {
  return usePreferencesStore.getState().incomingNotificationsEnabled;
}

export const notify = {
  success(message: string, options?: ToastOptions): void {
    if (isEnabled()) toast.success(message, options);
  },
  info(message: string, options?: ToastOptions): void {
    if (isEnabled()) toast.info(message, options);
  },
  warning(message: string, options?: ToastOptions): void {
    if (isEnabled()) toast.warning(message, options);
  },
  /** Jamais gaté — l'utilisateur doit toujours voir les erreurs. */
  error(message: string, options?: ToastOptions): void {
    toast.error(message, options);
  },

  /**
   * **Phase 12-C** — Réception détectée sur une tx entrante. Gaté
   * sur `incomingNotificationsEnabled` (≠ `notificationsEnabled`).
   */
  incoming(message: string, options?: ToastOptions): void {
    if (isIncomingEnabled()) toast.success(message, options);
  },
};
