/**
 * **Phase 12-D-A** — Wrapper Web Notification API.
 *
 * **Modèle** :
 *   - La permission navigateur (`Notification.permission`) et la
 *     préférence utilisateur (`preferences.systemNotificationsEnabled`)
 *     sont **deux états distincts**.
 *   - Le toggle demande la permission au premier ON (user gesture).
 *   - Si la permission est refusée, on garde le toast in-app + badge.
 *
 * **Emission** : uniquement si onglet **caché** (évite doublon
 * toast + notif système quand l'utilisateur regarde l'app).
 */
export type NotificationSupport = "unsupported" | "granted" | "denied" | "default";

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as NotificationSupport;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationSupport;
  } catch {
    return "denied";
  }
}

export interface ShowIncomingArgs {
  readonly title: string;
  readonly body: string;
  readonly tag?: string;
}

/**
 * Affiche une notification système si :
 *   1. l'API est supportée ;
 *   2. la permission est `granted` ;
 *   3. `document.hidden === true` (onglet caché).
 *
 * **Ne navigue pas automatiquement** — un click notif ramène le focus
 * seulement. `markAllRead` reste sous contrôle utilisateur.
 */
export function showIncomingNotification(args: ShowIncomingArgs): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") return false;

  // Garde-fou UX : pas de notif système si l'utilisateur est sur
  // l'app (le toast in-app suffit).
  if (typeof document !== "undefined" && !document.hidden) return false;

  try {
    const n = new Notification(args.title, {
      body: args.body,
      icon: "/sango-logo.png",
      tag: args.tag ?? "sango-incoming",
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();
    };
    return true;
  } catch {
    // Certains environnements (iframes, permissions restreintes)
    // throw à la construction.
    return false;
  }
}
