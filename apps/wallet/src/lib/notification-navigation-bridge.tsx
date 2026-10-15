import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { setNotificationNavigator } from "@/lib/web-notifications";

/**
 * **Phase 12-E** — Enregistre le `navigate` de React Router dans le
 * bridge module-level de `web-notifications.ts`.
 *
 * Doit être monté **dans** `<BrowserRouter>` (sinon `useNavigate`
 * throw). Rendu `null` — c'est un pur effet de bord.
 *
 * Cleanup au unmount : le bridge est remis à `null` pour éviter les
 * navigations fantômes.
 */
export function NotificationNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    setNotificationNavigator((path) => navigate(path));
    return () => setNotificationNavigator(null);
  }, [navigate]);

  return null;
}
