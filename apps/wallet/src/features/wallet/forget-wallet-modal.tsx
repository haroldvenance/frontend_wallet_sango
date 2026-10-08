import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/i18n/use-translation";

interface Props {
  readonly open: boolean;
  /**
   * Position 1-based du wallet dans le tri `createdAt` — utilisé pour
   * construire le **label de confirmation** (`Portefeuille {N}`).
   * `null` → modal fermée.
   */
  readonly walletPosition: number | null;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/**
 * Modal de confirmation "Oublier ce portefeuille" — Phase 3.4.
 *
 * **D21·B** — l'input doit être **le label UI positionnel**
 * (`Portefeuille N`, mockup-faithful), pas `entry.label` (souvent
 * dupliqué "Mon portefeuille").
 *
 * Message explicite : action destructive (retire l'entrée du keyring).
 * Pas de checkbox supplémentaire — l'input exact fournit la double
 * confirmation.
 */
export function ForgetWalletModal({
  open,
  walletPosition,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const t = useTranslation();
  const [input, setInput] = useState("");

  useEffect(() => {
    if (open) setInput("");
  }, [open]);

  if (!open || walletPosition === null) return null;

  const expectedLabel = t.wallets.labelPattern.replace(
    "{n}",
    String(walletPosition),
  );
  const matches = input.trim() === expectedLabel;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="forget-wallet-modal"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">
              {t.wallets.forget.title}
            </h2>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.wallets.forget.warning}
          </p>

          <div>
            <label
              htmlFor="forget-confirm-input"
              className="mb-1.5 block text-xs font-medium"
            >
              {t.wallets.forget.instruction.replace(
                "{label}",
                expectedLabel,
              )}
            </label>
            <input
              id="forget-confirm-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {t.wallets.forget.cancel}
          </button>
          <button
            type="button"
            data-testid="forget-wallet-confirm"
            onClick={onConfirm}
            disabled={!matches || busy}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-destructive text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t.wallets.forget.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
