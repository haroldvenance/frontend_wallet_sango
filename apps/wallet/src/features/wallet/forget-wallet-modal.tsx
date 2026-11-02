import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useTranslation } from "@/i18n/use-translation";

interface Props {
  readonly open: boolean;
  /**
   * Position 1-based du wallet dans le tri `createdAt` — utilisé pour
   * construire le label de confirmation (`Portefeuille {N}`).
   * `null` → modal fermé.
   */
  readonly walletPosition: number | null;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/**
 * Modal de confirmation "Oublier ce portefeuille".
 *
 * Action destructive : retire l'entrée du keyring IndexedDB de façon
 * irréversible. L'utilisateur doit **taper le label exact** pour
 * confirmer — pas de simple « OK / Annuler ».
 *
 * ⚠️ Pas de focus trap complet (le modal Forget est imbriqué dans
 * WalletsAndAccountsModal). Ajouter `inert` sur le conteneur parent
 * quand ouvert si besoin — évolution future.
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
  const titleId = useId();
  const descId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset à chaque ouverture.
  useEffect(() => {
    if (open) setInput("");
  }, [open]);

  // ESC + focus initial + scroll lock, uniquement quand le modal est
  // effectivement visible.
  useEffect(() => {
    if (!open || walletPosition === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);

    // Focus initial sur l'input de confirmation : l'utilisateur doit
    // taper consciemment, pas cliquer machinalement.
    inputRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, walletPosition, busy, onCancel]);

  if (!open || walletPosition === null) return null;

  const expectedLabel = t.wallets.labelPattern.replace(
    "{n}",
    String(walletPosition),
  );
  const matches = input.trim() === expectedLabel;

  function handleConfirm() {
    // Défense en profondeur : le bouton est `disabled` côté UI, mais
    // si l'appel vient d'ailleurs (test, automation), on refuse.
    if (!matches || busy) return;
    onConfirm();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-testid="forget-wallet-modal"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={() => {
        // Fermer au clic backdrop, sauf si une opération est en cours.
        if (!busy) onCancel();
      }}
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
            <h2 id={titleId} className="text-base font-semibold">
              {t.wallets.forget.title}
            </h2>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p
            id={descId}
            className="text-xs leading-relaxed text-muted-foreground"
          >
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
              ref={inputRef}
              id="forget-confirm-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            {t.wallets.forget.cancel}
          </button>
          <button
            type="button"
            data-testid="forget-wallet-confirm"
            onClick={handleConfirm}
            disabled={!matches || busy}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-destructive text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:opacity-50"
          >
            {t.wallets.forget.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}