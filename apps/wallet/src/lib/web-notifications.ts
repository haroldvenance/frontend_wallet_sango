/**
 * Wrapper Web Notification API.
 *
 * - Permission navigateur ≠ préférence utilisateur (deux états séparés).
 * - Permission demandée **uniquement sur action utilisateur**
 *   (`requestNotificationPermission` est appelée depuis le toggle
 *   `settings.tsx`, jamais automatiquement).
 * - Emission uniquement si l'onglet est **caché** — sinon le toast
 *   in-app suffit et évite un doublon.
 * - `txHash` est validé avant d'être encodé dans l'URL de deep-link :
 *   un hash malformé ne permet jamais une navigation arbitraire.
 */
export type NotificationSupport =
  | "unsupported"
  | "granted"
  | "denied"
  | "default";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

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
  /**
   * Hash de la tx (32 bytes hex, préfixe `0x`). S'il est fourni ET
   * valide, un clic navigue vers `/history?tx=<hash>`. Sinon le clic
   * ramène juste le focus sur l'app.
   */
  readonly txHash?: string;
}

type NotificationNavigator = (path: string) => void;
let _navigator: NotificationNavigator | null = null;

export function setNotificationNavigator(
  fn: NotificationNavigator | null,
): void {
  _navigator = fn;
}

export function showIncomingNotification(args: ShowIncomingArgs): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") return false;

  // Ne pas doubler le toast in-app quand l'utilisateur regarde l'app.
  if (typeof document !== "undefined" && !document.hidden) return false;

  // `tag` unique par tx : la nouvelle notif remplace la précédente si
  // le même hash est relancé, mais ne détruit pas les autres.
  const tag = args.tag ?? `sango-incoming-${args.txHash ?? "generic"}`;

  try {
    const n = new Notification(args.title, {
      body: args.body,
      icon: "/sango-logo.png",
      tag,
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();

      // Validation stricte du hash AVANT toute navigation. Un hash
      // malformé ne peut jamais dévier l'URL.
      if (_navigator && args.txHash && TX_HASH_RE.test(args.txHash)) {
        try {
          _navigator(
            `/history?tx=${encodeURIComponent(args.txHash)}`,
          );
        } catch {
          /* router démonté — silencieux */
        }
      }
    };
    return true;
  } catch {
    // Iframes, permissions restreintes : constructeur peut throw.
    return false;
  }
}