import { Lock, Unlock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Keyring, Wallet } from "@sango/wallet-core";

import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";
import { SangoLogo } from "@/components/branding/sango-logo";

/**
 * Overlay modal affiché quand un wallet existe dans le keyring mais que
 * la session est verrouillée (ou après auto-lock).
 *
 * Décision UX A : dashboard flouté en arrière-plan, l'utilisateur saisit
 * son password pour déverrouiller.
 */
export function UnlockOverlay() {
  const t = useTranslation();
  const { activeId, unlock } = useWalletStore();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeId || busy) return;
    setBusy(true);
    try {
      const keyring = await Keyring.open();
      const entry = await keyring.get(activeId);
      keyring.close();
      if (!entry) {
        toast.error(t.overlay.walletNotFound);
        return;
      }
      const wallet = await Wallet.importEncrypted(entry.stored, password);
      unlock({
        wallet,
        id: entry.id,
        format: entry.format,
        networkId: entry.networkId,
        network: entry.format === "sango-legacy" ? "testnet" : "testnet",
      });
      toast.success(t.overlay.unlocked);
      setPassword("");
    } catch (err) {
      toast.error(t.overlay.wrongPassword, {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-background/60">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg">
        <div className="mb-5 flex justify-center">
          <SangoLogo size={56} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{t.overlay.title}</h2>
            <p className="text-xs text-muted-foreground">
              {t.overlay.subtitle}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.overlay.passwordPlaceholder}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || !password}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Unlock className="size-4" />
            {busy ? t.overlay.unlocking : t.overlay.button}
          </button>
        </form>
      </div>
    </div>
  );
}
