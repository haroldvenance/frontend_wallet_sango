import { useEffect, useRef } from "react";

import { AUTO_LOCK_MS } from "@/lib/config";

/**
 * Auto-lock après inactivité.
 *
 * Écoute les événements utilisateur (click, keydown, mousemove, touchstart,
 * scroll) et déclenche `onLock()` après `AUTO_LOCK_MS` d'inactivité.
 *
 * Ne s'active que si `enabled` est vrai (typiquement : wallet unlocked).
 */
export function useAutoLock(enabled: boolean, onLock: () => void): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onLock, AUTO_LOCK_MS);
    };

    const events: (keyof WindowEventMap)[] = [
      "click",
      "keydown",
      "mousemove",
      "touchstart",
      "scroll",
    ];

    for (const e of events) window.addEventListener(e, reset, { passive: true });
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const e of events) window.removeEventListener(e, reset);
    };
  }, [enabled, onLock]);
}
