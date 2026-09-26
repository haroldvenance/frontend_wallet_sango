import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { CLIPBOARD_CLEAR_MS } from "@/lib/config";

/**
 * Copie dans le presse-papiers puis efface après `CLIPBOARD_CLEAR_MS`.
 *
 * Note : l'effacement n'est effectif que si la page a le focus ; les
 * navigateurs modernes rejettent silencieusement l'écriture sinon.
 */
export function useClipboard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(async (value: string, label = "Valeur copiée") => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void navigator.clipboard.writeText("").catch(() => {});
      }, CLIPBOARD_CLEAR_MS);
    } catch {
      toast.error("Impossible de copier");
    }
  }, []);
}
