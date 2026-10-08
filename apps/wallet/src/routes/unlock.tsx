import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Keyring } from "@sango/wallet-core";

import { AuthShell } from "@/components/branding/auth-shell";
import { SangoIcon } from "@/components/branding/sango-icon";
import { useTranslation } from "@/i18n/use-translation";
import { decryptAllWallets } from "@/lib/decrypt-wallets";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Déverrouille la **session keyring** (Phase 3.1, D-Phase3-1).
 *
 * Un password réussi déverrouille **toutes** les entrées qui
 * matchent. `switchWallet(id)` est ensuite instantané (aucun
 * re-prompt).
 *
 * `activeId` persisté est restauré s'il pointe vers un wallet
 * toujours présent ; sinon, premier wallet déverrouillé.
 */
export function Unlock() {
  const t = useTranslation();
  const navigate = useNavigate();
  const unlock = useWalletStore((s) => s.unlock);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  // Pré-charge le label du wallet actif (persisté) — purement cosmétique.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kr = await Keyring.open();
        const entries = await kr.list();
        kr.close();
        if (cancelled) return;
        const persistedActiveId = useWalletStore.getState().activeId;
        const target =
          (persistedActiveId
            ? entries.find((e) => e.id === persistedActiveId)
            : null) ??
          entries.sort((a, b) => b.createdAt - a.createdAt)[0];
        setActiveLabel(target?.label ?? null);
      } catch {
        // Silencieux : cosmétique.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit() {
    setBusy(true);
    try {
      const { decrypted } = await decryptAllWallets(password);

      if (decrypted.length === 0) {
        toast.error(t.unlock.wrongPassword);
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

      const activeId = useWalletStore.getState().activeId;
      const active = decrypted.find((d) => d.id === activeId);
      toast.success(
        `${t.unlock.unlocked} : ${active?.label ?? decrypted[0]!.label}`,
      );
      navigate("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={t.onboarding.unlock.title}
      subtitle={t.onboarding.unlock.subtitle}
      backTo="/welcome"
      logoSize={64}
      maxWidth="md"
    >
      <div className="mt-2 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
          <SangoIcon size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.onboarding.unlock.activeWallet}
            </p>
            <p className="truncate text-sm font-semibold">
              {activeLabel ?? t.onboarding.unlock.fallbackLabel}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="unlock-password"
            className="mb-1.5 block text-xs font-medium"
          >
            {t.onboarding.unlock.password}
          </label>
          <input
            id="unlock-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.onboarding.unlock.passwordPlaceholder}
            autoComplete="current-password"
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !password}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t.unlock.unlocking : t.onboarding.unlock.submit}
        </button>

        <div className="space-y-3 pt-4 text-center">
          <Link
            to="/import-evm"
            className="block text-xs font-medium text-primary hover:underline"
          >
            {t.onboarding.unlock.forgotPassword}
          </Link>
          <button
            type="button"
            onClick={() => navigate("/welcome")}
            className="block w-full text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.onboarding.unlock.useAnother}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
