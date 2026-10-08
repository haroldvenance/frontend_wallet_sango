import { Lock, Unlock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { decryptAllWallets } from "@/lib/decrypt-wallets";
import { useWalletStore } from "@/stores/wallet-store";
import { SangoLogo } from "@/components/branding/sango-logo";

/**
 * Overlay modal affiché quand un wallet existe dans le keyring mais que
 * la session est verrouillée (ou après auto-lock).
 *
 * Décision UX A : dashboard flouté en arrière-plan, l'utilisateur saisit
 * son password pour déverrouiller.
 *
 * **Phase 3.5** — migré vers `decryptAllWallets` (session keyring) :
 * le password déverrouille **toutes** les entrées keyring, pas
 * seulement `activeId`. Cohérent avec `unlock.tsx` (route).
 */
export function UnlockOverlay() {
  const t = useTranslation();
  const { unlock } = useWalletStore();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { decrypted } = await decryptAllWallets(password);

      if (decrypted.length === 0) {
        toast.error(t.overlay.wrongPassword);
        return;
      }

      unlock({
        wallets: decrypted.map((d) => ({
          id: d.id,
          wallet: d.wallet,
          format: d.format,
          networkId: d.networkId,
          label: d.label,
          createdAt: d.createdAt,
        })),
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
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="size-4" />
            {t.overlay.title}
          </div>
          <p className="text-xs text-muted-foreground">{t.overlay.subtitle}</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.overlay.passwordPlaceholder}
            autoComplete="current-password"
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || !password}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Unlock className="size-4" />
            {busy ? t.overlay.unlocking : t.overlay.button}
          </button>
        </form>
      </div>
    </div>
  );
}
