import { Bip39Wallet, Keyring } from "@sango/wallet-core";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AuthShell } from "@/components/branding/auth-shell";
import { PasswordStrength } from "@/components/branding/password-strength";
import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Flow de création unifié — Phase 5.3 (Trust Wallet model).
 *
 * **Une seule mnemonic BIP-39 → N chaînes.** Plus de pills réseau :
 * le portefeuille créé est une identité HD universelle qui dérive
 * SANGO (SLIP-0010 Ed25519), EVM (BIP-44 secp256k1) et Bitcoin
 * (BIP-84 secp256k1).
 *
 * **3 étapes** :
 *   1. form    → password + confirm + ack "no recovery"
 *   2. reveal  → 12 mots + warning + ack "j'ai noté"
 *   3. success → 3 adresses (EVM/BTC/SANGO) + "Accéder au portefeuille"
 *
 * **D-Phase5-3** :
 *   - D5.3-b·B — `networkId` initial = "ethereum-mainnet". Ce n'est
 *     **pas** la famille du wallet — c'est le réseau d'affichage
 *     initial. Le wallet reste multi-famille.
 *   - D5.3-c·A — mnemonic révélée avant persistance, éphémère.
 *   - D5.3-d·A — password + confirmation + ack "no recovery".
 *   - D5.3-e·A — label optionnel conservé.
 */
const INITIAL_NETWORK_ID = "ethereum-mainnet";

export function CreateUnified() {
  const navigate = useNavigate();
  const t = useTranslation();
  const addWallet = useWalletStore((s) => s.addWallet);
  const copy = useClipboard();

  const [step, setStep] = useState<"form" | "reveal" | "success">("form");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ackPassword, setAckPassword] = useState(false);
  const [ackNoted, setAckNoted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Secrets temporaires (jamais persistés, jetés après persistance).
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Bip39Wallet | null>(null);
  // Adresses figées pour l'écran succès.
  const [addresses, setAddresses] = useState<{
    evm: string;
    btc: string;
    sango: string;
  } | null>(null);

  function validateForm(): boolean {
    if (password.length < 8) {
      toast.error(t.create.passwordTooShort);
      return false;
    }
    if (password !== confirm) {
      toast.error(t.create.passwordMismatch);
      return false;
    }
    if (!ackPassword) {
      toast.error(t.onboarding.create.ackNoRecovery);
      return false;
    }
    return true;
  }

  async function onGenerate() {
    if (!validateForm()) return;
    setBusy(true);
    try {
      const { wallet: w, mnemonic: m } = await Bip39Wallet.generate();
      setMnemonic(m);
      setWallet(w);
      setStep("reveal");
    } catch (err) {
      toast.error(t.create.createError, {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  async function onPersist() {
    if (!wallet) return;
    if (!ackNoted) {
      toast.error(t.onboarding.create.revealAck);
      return;
    }
    setBusy(true);
    try {
      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();

      const id = wallet.defaultAddress.toLowerCase();
      const trimmedLabel =
        label.trim() || t.onboarding.create.fallbackLabel;
      const createdAt = Date.now();

      await keyring.put({
        id,
        label: trimmedLabel,
        format: "bip39",
        networkId: INITIAL_NETWORK_ID,
        stored,
        createdAt,
      });
      keyring.close();

      // addWallet préserve les wallets existants (création depuis le
      // dashboard d'un wallet existant).
      addWallet({
        id,
        wallet,
        format: "bip39",
        networkId: INITIAL_NETWORK_ID,
        label: trimmedLabel,
        createdAt,
      });

      // Dérive les 3 adresses AVANT de jeter les références sensibles.
      // Le wallet est une identité HD unique projetée sur 3 chaînes.
      setAddresses({
        evm: wallet.getIdentity(0).addressHex,
        btc: wallet.getBitcoinIdentity("mainnet", 0, 0).address,
        sango: wallet.getSangoIdentity(0).addressBech32Testnet,
      });

      setMnemonic(null);
      toast.success(t.create.createdAndSaved);
      setStep("success");
    } catch (err) {
      toast.error(t.create.saveError, {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  // ── Étape 3 : succès ────────────────────────────────────────
  if (step === "success" && addresses) {
    const chains: Array<{
      key: "ethereum" | "bitcoin" | "sango";
      label: string;
      value: string;
    }> = [
      {
        key: "ethereum",
        label: t.onboarding.create.chainLabels.ethereum,
        value: addresses.evm,
      },
      {
        key: "bitcoin",
        label: t.onboarding.create.chainLabels.bitcoin,
        value: addresses.btc,
      },
      {
        key: "sango",
        label: t.onboarding.create.chainLabels.sango,
        value: addresses.sango,
      },
    ];

    return (
      <AuthShell
        title={t.onboarding.create.successTitle}
        subtitle={t.onboarding.create.successSubtitle}
        logoSize={56}
        step={{ current: 3, total: 3 }}
      >
        <div className="mt-2 flex justify-center">
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10">
            <CheckCircle2
              className="size-10 text-emerald-500"
              strokeWidth={2.5}
            />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {chains.map((c) => (
            <div
              key={c.key}
              data-testid={`success-address-${c.key}`}
              className="rounded-2xl border bg-card p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-1 break-all font-mono text-xs leading-relaxed">
                {c.value}
              </p>
              <button
                type="button"
                onClick={() => copy(c.value, t.onboarding.create.successCopy)}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <Copy className="size-3.5" />
                {t.onboarding.create.successCopy}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t.onboarding.create.successEnter}
        </button>
      </AuthShell>
    );
  }

  // ── Étape 2 : reveal ────────────────────────────────────────
  if (step === "reveal" && mnemonic) {
    const words = mnemonic.split(" ");

    return (
      <AuthShell
        title={t.onboarding.create.revealTitle}
        subtitle={t.onboarding.create.revealSubtitle}
        logoSize={56}
        step={{ current: 2, total: 3 }}
      >
        <div className="mt-4 rounded-2xl border bg-card p-4">
          <div className="grid grid-cols-3 gap-2">
            {words.map((w, i) => (
              <div
                key={i}
                className="flex items-baseline gap-1.5 rounded-lg border bg-muted/30 px-2 py-1.5"
              >
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="font-mono text-xs">{w}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => copy(mnemonic, t.onboarding.create.copyMnemonic)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border bg-background py-2 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Copy className="size-3.5" />
            {t.onboarding.create.copyMnemonic}
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{t.onboarding.create.revealWarning}</span>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border bg-muted/30 p-3">
          <input
            type="checkbox"
            checked={ackNoted}
            onChange={(e) => setAckNoted(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
          />
          <span className="text-[11px] leading-snug">
            {t.onboarding.create.revealAck}
          </span>
        </label>

        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t.onboarding.create.labelPlaceholder}
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={onPersist}
            disabled={busy || !ackNoted}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="size-4" />
            {busy ? t.create.saving : t.onboarding.create.revealConfirm}
          </button>
        </div>
      </AuthShell>
    );
  }

  // ── Étape 1 : form ──────────────────────────────────────────
  return (
    <AuthShell
      title={t.onboarding.create.title}
      subtitle={t.onboarding.create.subtitle}
      backTo="/welcome"
      logoSize={56}
      step={{ current: 1, total: 3 }}
    >
      <div className="mt-2 space-y-5">
        {/* Password */}
        <div>
          <label
            htmlFor="create-password"
            className="mb-1.5 block text-xs font-medium"
          >
            {t.onboarding.create.password}
          </label>
          <div className="relative">
            <input
              id="create-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.onboarding.create.passwordPlaceholder}
              autoComplete="new-password"
              className="flex h-12 w-full rounded-xl border border-input bg-background px-3 pr-11 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <PasswordStrength password={password} className="mt-2" />
        </div>

        {/* Confirm */}
        <div>
          <label
            htmlFor="create-confirm"
            className="mb-1.5 block text-xs font-medium"
          >
            {t.onboarding.create.confirm}
          </label>
          <input
            id="create-confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Ack no recovery */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border bg-muted/30 p-3">
          <input
            type="checkbox"
            checked={ackPassword}
            onChange={(e) => setAckPassword(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
          />
          <span className="text-[11px] leading-snug text-muted-foreground">
            {t.onboarding.create.ackNoRecovery}
          </span>
        </label>

        {/* Submit */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t.create.generating : t.onboarding.create.submit}
        </button>
      </div>
    </AuthShell>
  );
}
