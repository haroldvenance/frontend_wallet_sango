import { Bip39Wallet, Keyring, Wallet } from "@sango/wallet-core";
import type { Network } from "@sango/types";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";
import { AuthShell } from "@/components/branding/auth-shell";

/**
 * Résout le label SANGO (Network) depuis un networkId wallet-chains.
 *
 * En E1, seuls "sango-devnet" et "ethereum-sepolia" existent. Tout ce
 * qui n'est pas SANGO renvoie "testnet" (défaut neutre — les hooks EVM
 * lisent `networkId`, pas `network`).
 */
function resolveSangoLabel(networkId: string): Network {
  if (networkId === "sango-devnet" || networkId === "sango-testnet") {
    return "testnet";
  }
  if (networkId === "sango-mainnet") {
    return "mainnet";
  }
  return "testnet";
}

export function Unlock() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { unlock } = useWalletStore();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  // Pré-charge le label du premier wallet du keyring (sans le
  // déverrouiller). E2.5 — affichage "Portefeuille principal".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kr = await Keyring.open();
        const entries = await kr.list();
        kr.close();
        if (cancelled) return;
        const first = entries.sort((a, b) => b.createdAt - a.createdAt)[0];
        setActiveLabel(first?.label ?? null);
      } catch {
        // Silencieux : le label est purement cosmétique
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

      // Essaie tous les wallets avec ce password, dispatch par format.
      for (const entry of entries) {
        try {
          if (entry.format === "sango-legacy") {
            const w = await Wallet.importEncrypted(entry.stored, password);
            unlock({
              wallet: w,
              id: entry.id,
              format: "sango-legacy",
              networkId: entry.networkId,
              network: resolveSangoLabel(entry.networkId),
            });
          } else {
            const w = await Bip39Wallet.importEncrypted(
              entry.stored,
              password,
            );
            unlock({
              wallet: w,
              id: entry.id,
              format: "bip39",
              networkId: entry.networkId,
              network: resolveSangoLabel(entry.networkId),
            });
          }
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
      title={t.onboarding.unlock.title}
      subtitle={t.onboarding.unlock.subtitle}
      backTo="/welcome"
      logoSize={64}
      maxWidth="md"
    >
      <div className="mt-2 space-y-4">
        {/* Card wallet actif */}
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            S
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.onboarding.unlock.activeWallet}
            </p>
            <p className="truncate text-sm font-semibold">
              {activeLabel ?? t.onboarding.unlock.fallbackLabel}
            </p>
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <label
            htmlFor="unlock-password"
            className="mb-1.5 block text-xs font-medium"
          >
            {t.onboarding.unlock.password}
          </label>
          <div className="relative">
            <input
              id="unlock-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.onboarding.unlock.passwordPlaceholder}
              autoComplete="current-password"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-3 pr-11 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              aria-label={password ? "Masquer" : "Afficher"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {/* Placeholder — œil toggle différé si besoin */}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !password}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t.unlock.unlocking : t.onboarding.unlock.submit}
        </button>

        {/* Liens secondaires */}
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
