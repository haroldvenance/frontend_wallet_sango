import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/i18n/use-translation";
import { useWallets } from "@/hooks/use-wallets";
import { useWalletStore } from "@/stores/wallet-store";

import { WalletRow } from "./wallet-row";

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Modal "Portefeuilles" — Phase 3.3 (mockup 3).
 *
 * - Liste tous les wallets déverrouillés (via `useWallets()`).
 * - Un seul wallet déplié à la fois (D3·A) — état UI local.
 * - Clic sur un wallet → `switchWallet(id)` + expand (D10·A).
 * - Pas de footer ni de menu `⋯` en 3.3 (D16·C, D17·C).
 *
 * **D18·A** — montage conditionnel (`if (!open) return null`).
 * `expandedWalletId` est initialisé à `activeId` à chaque ouverture.
 *
 * **D14·A** — pas de store UI global : l'état `open` vit chez
 * l'appelant. Le modal peut être réutilisé depuis plusieurs points
 * d'entrée.
 */
export function WalletsAndAccountsModal({ open, onClose }: Props) {
  const t = useTranslation();
  const { wallets } = useWallets();
  const activeId = useWalletStore((s) => s.activeId);
  const switchWallet = useWalletStore((s) => s.switchWallet);

  const [expandedWalletId, setExpandedWalletId] = useState<string | null>(
    activeId,
  );

  // Réinitialise l'expand à chaque réouverture (le composant est
  // remonté — D18·A).
  useEffect(() => {
    if (open) setExpandedWalletId(activeId);
  }, [open, activeId]);

  if (!open) return null;

  function handleSelect(id: string) {
    // D10·A — switch atomique + expand.
    switchWallet(id);
    setExpandedWalletId(id);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="wallets-and-accounts-modal"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{t.wallets.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.wallets.close}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
          {wallets.map((w) => (
            <WalletRow
              key={w.id}
              wallet={w}
              isExpanded={w.id === expandedWalletId}
              onSelect={() => handleSelect(w.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
