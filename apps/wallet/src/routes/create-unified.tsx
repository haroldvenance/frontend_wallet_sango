import { Bip39Wallet, Keyring, Wallet } from "@sango/wallet-core";
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
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Flow de création unifié — E2.5 / E2.5.b.
 *
 * **3 étapes** :
 *   1. form    → pills réseau + password + ack "no recovery"
 *   2. reveal  → 12 mots (ou seed hex) + warning + ack "j'ai noté"
 *   3. success → check + adresse + "Accéder au portefeuille"
 *
 * **D-E2.5-1** — Point d'entrée unique `/create`. Chaque pill mappe
 * vers un `networkId` **safe par défaut** (testnets) :
 *   SANGO     → "sango-devnet"
 *   Ethereum  → "ethereum-sepolia"
 *   Bitcoin   → "bitcoin-testnet"
 *   BSC       → "bsc-testnet"
 *
 * La logique de création est **partagée** :
 *   SANGO   → Ed25519, seed 32 bytes
 *   EVM/BTC → BIP-39, mnemonic 12 mots
 */
type NetworkChoice = "sango" | "ethereum" | "bitcoin" | "bsc";

interface ChoiceConfig {
  readonly id: NetworkChoice;
  readonly networkId: string;
  readonly format: "sango-legacy" | "bip39";
}

const CHOICES: Record<NetworkChoice, ChoiceConfig> = {
  sango: {
    id: "sango",
    networkId: "sango-devnet",
    format: "sango-legacy",
  },
  ethereum: {
    id: "ethereum",
    networkId: "ethereum-sepolia",
    format: "bip39",
  },
  bitcoin: {
    id: "bitcoin",
    networkId: "bitcoin-testnet",
    format: "bip39",
  },
  bsc: {
    id: "bsc",
    networkId: "bsc-testnet",
    format: "bip39",
  },
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Retourne l'adresse à afficher sur l'écran succès selon la famille.
 *
 * - SANGO  : bech32m `sango1…` (via `identity.addressBech32`)
 * - EVM    : `0x…` (via `defaultAddress`)
 * - Bitcoin : `tb1q…` / `bc1q…` (dérivé du networkId)
 */
function deriveDisplayAddress(
  choice: NetworkChoice,
  wallet: Wallet | Bip39Wallet,
): string {
  if (wallet instanceof Wallet) {
    return wallet.identity.addressBech32;
  }
  if (choice === "bitcoin") {
    const btcNetwork = "testnet" as const; // pills n'exposent que testnet
    return wallet.getBitcoinIdentity(btcNetwork, 0, 0).address;
  }
  return wallet.defaultAddress;
}

export function CreateUnified() {
  const navigate = useNavigate();
  const t = useTranslation();
  const addWallet = useWalletStore((s) => s.addWallet);
  const { network } = useSdkStore();
  const copy = useClipboard();

  const [step, setStep] = useState<"form" | "reveal" | "success">("form");
  const [choice, setChoice] = useState<NetworkChoice>("sango");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ackPassword, setAckPassword] = useState(false);
  const [ackNoted, setAckNoted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Secrets temporaires
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [seedHex, setSeedHex] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | Bip39Wallet | null>(null);
  // Adresse figée pour l'écran succès
  const [displayAddress, setDisplayAddress] = useState<string | null>(null);

  const cfg = CHOICES[choice];

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
      toast.error(
        t.onboarding.create.ackNoRecovery,
      );
      return false;
    }
    return true;
  }

  async function onGenerate() {
    if (!validateForm()) return;
    setBusy(true);
    try {
      if (cfg.format === "sango-legacy") {
        const seed = crypto.getRandomValues(new Uint8Array(32));
        const w = await Wallet.fromSeed(seed, network);
        const seedStr = bytesToHex(seed);
        seed.fill(0);
        setSeedHex(seedStr);
        setWallet(w);
      } else {
        const { wallet: w, mnemonic: m } = await Bip39Wallet.generate();
        setMnemonic(m);
        setWallet(w);
      }
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

      const id =
        wallet instanceof Wallet
          ? wallet.identity.addressHex.toLowerCase()
          : wallet.defaultAddress.toLowerCase();
      const trimmedLabel = label.trim() || "Mon portefeuille";
      const createdAt = Date.now();

      await keyring.put({
        id,
        label: trimmedLabel,
        format: cfg.format,
        networkId: cfg.networkId,
        stored,
        createdAt,
      });
      keyring.close();

      // Phase 4.1-fix — `addWallet` ajoute à la session runtime sans
      // écraser les wallets déjà déverrouillés (l'utilisateur peut
      // créer un 2ᵉ wallet depuis le dashboard du 1ᵉʳ). `unlock()`
      // **remplace** — réservé à `decryptAllWallets`.
      addWallet({
        id,
        wallet,
        format: cfg.format,
        networkId: cfg.networkId,
        label: trimmedLabel,
        createdAt,
      });

      // Capture l'adresse AVANT de jeter les refs sensibles.
      setDisplayAddress(deriveDisplayAddress(choice, wallet));

      // Jette les références sensibles
      setMnemonic(null);
      setSeedHex(null);

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
  if (step === "success" && displayAddress) {
    return (
      <AuthShell
        title={t.onboarding.create.successTitle}
        subtitle={t.onboarding.create.successSubtitle.replace(
          "{family}",
          t.onboarding.networks[choice],
        )}
        logoSize={56}
        step={{ current: 3, total: 3 }}
      >
        {/* Check circle */}
        <div className="mt-2 flex justify-center">
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10">
            <CheckCircle2
              className="size-10 text-emerald-500"
              strokeWidth={2.5}
            />
          </div>
        </div>

        {/* Address card */}
        <div className="mt-8 rounded-2xl border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t.onboarding.create.successAddressLabel}
          </p>
          <p className="mt-2 break-all font-mono text-sm font-medium leading-relaxed">
            {displayAddress}
          </p>
          <button
            type="button"
            onClick={() =>
              copy(displayAddress, t.onboarding.create.successCopy)
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Copy className="size-4" />
            {t.onboarding.create.successCopy}
          </button>
        </div>

        {/* Enter wallet */}
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
  if (step === "reveal" && (mnemonic || seedHex)) {
    const isSango = seedHex !== null;
    const words = mnemonic ? mnemonic.split(" ") : null;

    return (
      <AuthShell
        title={
          isSango
            ? t.onboarding.create.seedRevealTitle
            : t.onboarding.create.revealTitle
        }
        subtitle={
          isSango
            ? t.onboarding.create.seedRevealSubtitle
            : t.onboarding.create.revealSubtitle
        }
        logoSize={56}
        step={{ current: 2, total: 3 }}
      >
        {isSango ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border bg-card p-4">
            <code className="break-all font-mono text-xs leading-6">
              {seedHex}
            </code>
            <button
              type="button"
              onClick={() => copy(`0x${seedHex}`, t.create.seedCopied)}
              className="shrink-0 rounded-lg p-2 transition-colors hover:bg-accent"
              aria-label={t.onboarding.create.copySeed}
            >
              <Copy className="size-4" />
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border bg-card p-4">
            <div className="grid grid-cols-3 gap-2">
              {words!.map((w, i) => (
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
              onClick={() =>
                copy(mnemonic!, t.onboarding.create.copyMnemonic)
              }
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border bg-background py-2 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Copy className="size-3.5" />
              {t.onboarding.create.copyMnemonic}
            </button>
          </div>
        )}

        {/* Warning */}
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{t.onboarding.create.revealWarning}</span>
        </div>

        {/* Ack noted */}
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
        {/* Pills réseau */}
        <div>
          <p className="mb-2 text-xs font-medium">
            {t.onboarding.create.network}
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CHOICES) as NetworkChoice[]).map((id) => {
              const isActive = choice === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`network-pill-${id}`}
                  onClick={() => setChoice(id)}
                  className={[
                    "rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  ].join(" ")}
                >
                  {t.onboarding.networks[id]}
                </button>
              );
            })}
          </div>
        </div>

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
