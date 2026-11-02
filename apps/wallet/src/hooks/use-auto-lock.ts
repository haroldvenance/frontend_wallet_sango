import { useEffect, useRef } from "react";

import { AUTO_LOCK_MS } from "@/lib/config";

/**
 * Verrouille automatiquement le wallet après une période d'inactivité.
 *
 * **Définition d'« interaction »** : un geste clavier/pointeur/molette
 * explicite de l'utilisateur. On exclut volontairement :
 *   - `mousemove` : signal ambigu (l'utilisateur peut être actif sans
 *     bouger la souris, ou bouger la souris sans lire) ;
 *   - `scroll` programmatique : rare dans un wallet mais possible
 *     (`scrollTo`, virtualisation) — gardé côté événement natif car il
 *     n'y a pas de moyen simple de distinguer.
 *
 * Events écoutés : `pointerdown` (couvre souris/touch/stylus),
 * `keydown`, `wheel`, `scroll`.
 *
 * **Latence de lock** : un tick toutes les 30 s. Le pire cas est
 * timeoutMs + 30 s avant lock effectif — acceptable (l'auto-lock
 * n'est pas un anti-intrusion temps réel, c'est une protection
 * d'inactivité).
 *
 * **Au retour d'onglet** (`visibilitychange`) :
 *   - si absence > timeoutMs → lock immédiat ;
 *   - sinon → reset du timer (l'utilisateur revient, il est là).
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

    // `pointerdown` unifie souris + touch + stylus. Pas de `mousemove`.
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "wheel",
      "scroll",
    ];

    for (const e of events) {
      // `passive: true` sur `scroll`/`wheel` pour ne pas bloquer le
      // scroll natif. `pointerdown`/`keydown` sans passive : pas de
      // preventDefault, mais le flag `passive` évite juste un warning.
      window.addEventListener(e, touch, { passive: true });
    }

    const onVisibility = (): void => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityRef.current > timeoutMs) {
        onLockRef.current();
      } else {
        lastActivityRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Tick périodique : détecte le dépassement en cours de session.
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