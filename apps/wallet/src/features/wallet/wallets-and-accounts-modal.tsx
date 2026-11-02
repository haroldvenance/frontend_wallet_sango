import { Keyring } from "@sango/wallet-core";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
 * Modal "Portefeuilles" — liste des wallets déverrouillés.
 *
 * - Un seul wallet déplié à la fois (`expandedWalletId`).
 * - Clic sur un wallet → `switchWallet(id)` + expand.
 * - Footer : Créer / Importer (navigue puis ferme).
 * - Modal Forget imbriquée pour la suppression.
 *
 * ⚠️ Pas de focus trap complet — les éléments derrière restent
 * focusables via Tab. À renforcer avec `inert` si besoin (le modal
 * Forget est déjà isolé par son z-index mais pas par le focus).
 */
export function WalletsAndAccountsModal({ open, onClose }: Props) {
  const t = useTranslation();
  const navigate = useNavigate();
  const { wallets } = useWallets();
  const activeId = useWalletStore((s) => s.activeId);
  const switchWallet = useWalletStore((s) => s.switchWallet);
  const forgetWallet = useWalletStore((s) => s.forgetWallet);

  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const [expandedWalletId, setExpandedWalletId] = useState<string | null>(
    activeId,
  );
  const [pendingForgetId, setPendingForgetId] = useState<string | null>(null);
  const [forgetBusy, setForgetBusy] = useState(false);

  // Réinitialise l'expand à chaque réouverture.
  useEffect(() => {
    if (open) setExpandedWalletId(activeId);
  }, [open, activeId]);

  // ESC + focus initial + scroll lock.
  // ⚠️ On n'intercepte ESC que si la modal Forget N'EST PAS ouverte :
  // elle a son propre handler ESC (même listener `window`), et on ne
  // veut pas fermer les deux d'un coup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pendingForgetId === null) onClose();
    };
    window.addEventListener("keydown", onKey);

    closeBtnRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, pendingForgetId, onClose]);

  if (!open) return null;

  function handleSelect(id: string) {
    switchWallet(id);
    setExpandedWalletId(id);
  }

  function handleFooterCreate() {
    onClose();
    navigate("/create");
  }

  function handleFooterImport() {
    onClose();
    navigate("/import");
  }

  async function handleConfirmForget() {
    if (!pendingForgetId) return;
    // Garde-fou : si un refresh concurrent a supprimé le wallet de la
    // liste rendue, on abandonne proprement.
    const target = wallets.find((w) => w.id === pendingForgetId);
    if (!target) {
      setPendingForgetId(null);
      return;
    }
    const id = pendingForgetId;
    setForgetBusy(true);
    try {
      // Ordre : keyring.remove() PUIS store.forgetWallet().
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
    } catch {
      // Jamais `(err as Error).message` — peut contenir un ID
      // IndexedDB, un chemin de blob, un quota, etc.
      toast.error(t.wallets.forget.error);
    } finally {
      setForgetBusy(false);
    }
  }

  const pendingWallet = pendingForgetId
    ? (wallets.find((w) => w.id === pendingForgetId) ?? null)
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="wallets-and-accounts-modal"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">
            {t.wallets.title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t.wallets.close}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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

        <div className="space-y-2 border-t p-3">
          <button
            type="button"
            data-testid="footer-create-wallet"
            onClick={handleFooterCreate}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t.wallets.footer.create}
          </button>
          <button
            type="button"
            data-testid="footer-import-wallet"
            onClick={handleFooterImport}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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