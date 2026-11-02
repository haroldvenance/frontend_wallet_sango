import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { setNotificationNavigator } from "@/lib/web-notifications";

/**
 * Whitelist de navigation : le bridge n'accepte QUE les paths liés
 * aux notifications. Toute autre valeur est ignorée (défense en
 * profondeur — `web-notifications.ts` valide déjà `txHash` avant
 * d'émettre le path, mais on ne s'en remet pas à un seul point).
 */
const HISTORY_TX_PREFIX = "/history?tx=";

function isAllowedBridgePath(path: string): boolean {
  // Lien de deep-link historique uniquement. `tx` a déjà été validé
  // comme hash hex (32 bytes) côté émetteur.
  if (!path.startsWith(HISTORY_TX_PREFIX)) return false;
  // Restreindre à un hash hex exact dans le query.
  const encoded = path.slice(HISTORY_TX_PREFIX.length);
  try {
    const hash = decodeURIComponent(encoded);
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
  } catch {
    return false;
  }
}

/**
 * Enregistre le `navigate` de React Router dans le bridge
 * module-level de `web-notifications.ts`.
 *
 * Doit être monté **dans** `<BrowserRouter>` (sinon `useNavigate`
 * throw). Rendu `null` — pur effet de bord.
 *
 * Cleanup au unmount : bridge remis à `null` pour éviter les
 * navigations fantômes.
 */
export function NotificationNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    setNotificationNavigator((path) => {
      if (!isAllowedBridgePath(path)) {
        if (import.meta.env.DEV) {
          console.warn(
            "[notification-bridge] rejected non-whitelisted path",
          );
        }
        return;
      }
      navigate(path);
    });
    return () => setNotificationNavigator(null);
  }, [navigate]);

  return null;
}