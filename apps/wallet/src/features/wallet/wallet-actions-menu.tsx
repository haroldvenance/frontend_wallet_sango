import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/i18n/use-translation";

interface Props {
  /** `true` si l'action Forget est interdite (dernier wallet, D22·A). */
  readonly disabled: boolean;
  readonly onForget: () => void;
}

/**
 * Menu `⋯` d'une `WalletRow` — Phase 3.4.
 *
 * **D16·C (revu)** — le menu n'est visible que sur la **row active**
 * (mockup 3). Pour supprimer un autre wallet, l'utilisateur doit
 * d'abord le rendre actif.
 *
 * **D22·A** — l'item `Oublier ce portefeuille` est **désactivé** si
 * `disabled === true` (dernier wallet), avec un `title` explicatif.
 *
 * Popover local, fermeture au clic extérieur. Pas de store UI global.
 */
export function WalletActionsMenu({ disabled, onForget }: Props) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="wallet-actions-trigger"
        aria-label={t.wallets.actions.menu}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          data-testid="wallet-actions-menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border bg-card p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            data-testid="wallet-action-forget"
            disabled={disabled}
            title={disabled ? t.wallets.actions.forgetLastDisabled : undefined}
            onClick={() => {
              setOpen(false);
              onForget();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.wallets.actions.forget}
          </button>
        </div>
      )}
    </div>
  );
}
