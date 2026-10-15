import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * **Phase 12-E** — Lit `?tx=<hash>` dans l'URL, scrolle vers la row
 * `<div id="tx-<hash>">` correspondante, applique `.highlight-tx`
 * pendant 2.5s, puis nettoie le paramètre d'URL.
 *
 * **Pourquoi un polling** : la liste peut être rendue de façon
 * asynchrone (React Query refetch). On ne peut pas supposer que
 * l'élément existe au premier render.
 *
 * **Garde-fous** :
 *   - URL nettoyée en `{ replace: true }` → pas de nouvelle entrée
 *     d'historique, un back navigateur ne re-trigger pas le highlight.
 *   - Timeout 5s si l'élément n'apparaît jamais (mauvais réseau,
 *     hash inconnu, autre réseau).
 *   - Re-trigger géré si `?tx=` change pendant que le hook tourne.
 */
const POLL_MS = 50;
const HIGHLIGHT_MS = 2500;
const GIVE_UP_MS = 5000;

export function useHighlightTx(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const hashFromUrl = searchParams.get("tx");
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hashFromUrl) {
      lastProcessedRef.current = null;
      return;
    }
    if (lastProcessedRef.current === hashFromUrl) return;
    lastProcessedRef.current = hashFromUrl;

    const targetId = `tx-${hashFromUrl}`;
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;

    const poll = setInterval(() => {
      const el = document.getElementById(targetId);
      if (!el) return;

      clearInterval(poll);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-tx");
      highlightTimer = setTimeout(() => {
        el.classList.remove("highlight-tx");
      }, HIGHLIGHT_MS);

      setSearchParams({}, { replace: true });
    }, POLL_MS);

    const giveUp = setTimeout(() => {
      clearInterval(poll);
      setSearchParams({}, { replace: true });
    }, GIVE_UP_MS);

    return () => {
      clearInterval(poll);
      clearTimeout(giveUp);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, [hashFromUrl, setSearchParams]);
}
