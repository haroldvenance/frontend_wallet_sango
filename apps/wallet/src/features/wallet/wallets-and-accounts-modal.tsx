import { Keyring } from "@sango/wallet-core";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { useWallets } from "@/hooks/use-wallets";
import { useWalletStore } from "@/stores/wallet-store";

import { ForgetWalletModal } from "./forget-wallet-modal";
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
  const navigate = useNavigate();
  const { wallets } = useWallets();
  const activeId = useWalletStore((s) => s.activeId);
  const switchWallet = useWalletStore((s) => s.switchWallet);
  const forgetWallet = useWalletStore((s) => s.forgetWallet);

  const [expandedWalletId, setExpandedWalletId] = useState<string | null>(
    activeId,
  );
  // D23·A — état local de la modal Forget.
  const [pendingForgetId, setPendingForgetId] = useState<string | null>(null);
  const [forgetBusy, setForgetBusy] = useState(false);

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

  function handleFooterCreate() {
    // D26·A — onClose() explicite puis navigate.
    onClose();
    navigate("/create");
  }

  function handleFooterImport() {
    onClose();
    navigate("/import");
  }

  async function handleConfirmForget() {
    if (!pendingForgetId) return;
    const id = pendingForgetId;
    setForgetBusy(true);
    try {
      // D20·A — ordre : keyring.remove() PUIS store.forgetWallet().
      // Si le premier échoue, le store n'est pas touché.
      const kr = await Keyring.open();
      try {
        await kr.remove(id);
      } finally {
        kr.close();
      }
      forgetWallet(id);
      setPendingForgetId(null);
      toast.success(t.wallets.forget.success);
    } catch (err) {
      toast.error(t.wallets.forget.error, {
        description: (err as Error).message,
      });
    } finally {
      setForgetBusy(false);
    }
  }

  // Wallet ciblé par la modal Forget (position → label confirmation).
  const pendingWallet = pendingForgetId
    ? (wallets.find((w) => w.id === pendingForgetId) ?? null)
    : null;

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
              canForget={wallets.length > 1}
              onForgetRequest={() => setPendingForgetId(w.id)}
            />
          ))}
        </div>

        {/* D17·C (revu) — footer Phase 3.4 */}
        <div className="space-y-2 border-t p-3">
          <button
            type="button"
            data-testid="footer-create-wallet"
            onClick={handleFooterCreate}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t.wallets.footer.create}
          </button>
          <button
            type="button"
            data-testid="footer-import-wallet"
            onClick={handleFooterImport}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent"
          >
            {t.wallets.footer.import}
          </button>
        </div>
      </div>

      <ForgetWalletModal
        open={pendingWallet !== null}
        walletPosition={pendingWallet?.position ?? null}
        busy={forgetBusy}
        onCancel={() => setPendingForgetId(null)}
        onConfirm={handleConfirmForget}
      />
    </div>
  );
}
