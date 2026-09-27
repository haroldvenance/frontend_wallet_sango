import { Keyring, Wallet } from "@sango/wallet-core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";
import { AuthShell } from "@/components/branding/auth-shell";

export function Unlock() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { unlock } = useWalletStore();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      const keyring = await Keyring.open();
      const entries = await keyring.list();
      if (entries.length === 0) {
        toast.error(t.unlock.noWallet);
        navigate("/welcome");
        return;
      }
      // Essaie tous les wallets avec ce password.
      for (const entry of entries) {
        try {
          const w = await Wallet.importEncrypted(entry.stored, password);
          unlock(w, entry.id, entry.network);
          keyring.close();
          toast.success(`${t.unlock.unlocked} : ${entry.label}`);
          navigate("/");
          return;
        } catch {
          // essaie le suivant
        }
      }
      keyring.close();
      toast.error(t.unlock.wrongPassword);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Restaurer un wallet"
      subtitle={t.unlock.subtitle}
      backTo="/welcome"
      logoSize={56}
    >

      <div className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.unlock.passwordPlaceholder}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !password}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t.unlock.unlocking : t.unlock.button}
        </button>
      </div>
    </AuthShell>
  );
}
