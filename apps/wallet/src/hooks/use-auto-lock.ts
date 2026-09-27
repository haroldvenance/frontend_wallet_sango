import { useEffect, useRef } from "react";

import { AUTO_LOCK_MS } from "@/lib/config";

/**
 * Verrouille automatiquement le wallet après une période d'inactivité.
 *
 * - Écoute : mousemove, keydown, click, touchstart, scroll.
 * - Recalcule le timer au retour d'onglet (visibilitychange).
 * - Ignore les events quand `enabled === false`.
 *
 * Le timer est réinitialisé à chaque interaction. Un check toutes les
 * 30 s détecte le dépassement de seuil.
 */
export function useAutoLock(
  enabled: boolean,
  onLock: () => void,
  timeoutMs = AUTO_LOCK_MS,
): void {
  const lastActivityRef = useRef<number>(Date.now());
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();

    const touch = (): void => {
      lastActivityRef.current = Date.now();
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
    ];

    for (const e of events) {
      window.addEventListener(e, touch, { passive: true });
    }

    // Recalcule au retour au premier plan (l'onglet peut être resté
    // caché longtemps sans events).
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        // Si on était caché plus longtemps que le timeout, on lock direct.
        if (Date.now() - lastActivityRef.current > timeoutMs) {
          onLockRef.current();
        } else {
          lastActivityRef.current = Date.now();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Check périodique.
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current > timeoutMs) {
        onLockRef.current();
      }
    }, 30_000);

    return () => {
      for (const e of events) {
        window.removeEventListener(e, touch);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [enabled, timeoutMs]);
}
