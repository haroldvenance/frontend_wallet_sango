import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { CLIPBOARD_CLEAR_MS } from "@/lib/config";

/**
 * Copie dans le presse-papiers puis efface **uniquement si le contenu
 * n'a pas été remplacé** par l'utilisateur, après `CLIPBOARD_CLEAR_MS`.
 *
 * **Sémantique de l'effacement** :
 *   1. On écrit `value` → on programme un clear à T+30s.
 *   2. À T+30s, on lit le presse-papiers (`readText`).
 *      - même valeur  → on écrase par une string vide ;
 *      - valeur autre → on ne touche à rien (l'utilisateur a copié
 *        autre chose entre-temps) ;
 *      - lecture refusée (focus perdu, permission) → on ne touche à
 *        rien (on ne peut pas vérifier, ne rien casser).
 *
 * **Limitations documentées** :
 *   - `readText()` peut être refusée si la page n'a pas le focus
 *     (Firefox, contexte permission stricte). Dans ce cas le clear
 *     **n'est pas appliqué** — trade-off sécurité UX assumé.
 *   - Si l'onglet est fermé avant T+30s, **le clear n'est PAS garanti**.
 *     Le navigateur peut tuer les timers sans cleanup. Ne pas
 *     promettre un effacement garanti dans la doc utilisateur.
 *   - `writeText("")` peut être ignoré sur certains navigateurs. Pas
 *     de contournement fiable disponible.
 *
 * Le timer est annulé au unmount du composant appelant pour éviter
 * un clear tardif après disparition du contexte.
 */
export function useClipboard() {
  const t = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup au unmount : annule le timer programmé.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return useCallback(
    async (value: string, label?: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(label ?? t.common.copied);
      } catch {
        toast.error(t.receivePage.actions.copyError);
        return;
      }

      // Reprogramme le timer à chaque copie.
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void clearIfStillOurs(value);
        timerRef.current = null;
      }, CLIPBOARD_CLEAR_MS);
    },
    [t],
  );
}

/**
 * Efface le presse-papiers **uniquement** si son contenu est encore
 * `expected`. Ne touche à rien sinon.
 *
 * En cas d'échec de `readText` (permission refusée, pas de focus), on
 * laisse le presse-papiers intact — c'est le comportement le plus sûr
 * pour l'utilisateur. La valeur copiée reste exposée plus longtemps
 * que prévu, mais aucun contenu externe n'est détruit.
 */
async function clearIfStillOurs(expected: string): Promise<void> {
  try {
    const current = await navigator.clipboard.readText();
    if (current !== expected) {
      // L'utilisateur a copié autre chose — ne pas écraser.
      return;
    }
    await navigator.clipboard.writeText("");
  } catch {
    // readText ou writeText refusé — laisser tel quel.
    if (import.meta.env.DEV) {
      console.warn("[use-clipboard] auto-clear skipped (permission/focus)");
    }
  }
}