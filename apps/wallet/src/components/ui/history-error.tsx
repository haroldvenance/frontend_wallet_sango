import { AlertTriangle, RefreshCw } from "lucide-react";

import { useTranslation } from "@/i18n/use-translation";

/**
 * **Phase 13-B** — État d'erreur de chargement d'historique.
 *
 * **Distinct de l'état vide** : "Aucune transaction" ≠ "Impossible
 * de charger". Utilisé pour les vraies erreurs réseau / RPC.
 *
 * Garde-fou 2 (audit 13) : ne jamais masquer une erreur réseau
 * derrière un état vide.
 */
interface HistoryErrorProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

export function HistoryError({ message, onRetry }: HistoryErrorProps) {
  const t = useTranslation();
  return (
    <div
      data-testid="history-error"
      className="flex flex-col items-center gap-3 p-6 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{t.history.errorTitle}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          data-testid="history-error-retry"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className="size-3" />
          {t.history.retry}
        </button>
      )}
    </div>
  );
}
