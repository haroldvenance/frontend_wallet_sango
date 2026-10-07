import { Bip39Wallet, Keyring, Wallet } from "@sango/wallet-core";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
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
 * Flow de création unifié — E2.5.
 *
 * **D-E2.5-1** — Point d'entrée unique `/create`. L'utilisateur
 * choisit la famille via des pills (SANGO / Ethereum / Bitcoin /
 * BSC), puis remplit le formulaire. La logique de création est
 * **partagée** :
 *
 *   SANGO   → Ed25519, seed 32 bytes, reveal hex
 *   EVM     → BIP-39, mnemonic 12 mots, reveal mnemonic
 *   Bitcoin → BIP-39, mnemonic 12 mots, reveal mnemonic
 *
 * Chaque pill mappe vers un `networkId` **safe par défaut** :
 *   SANGO     → "sango-devnet"
 *   Ethereum  → "ethereum-sepolia"   (testnet, D-E2.3-1)
 *   Bitcoin   → "bitcoin-testnet"    (testnet, D-E2.1-2)
 *   BSC       → "bsc-testnet"        (testnet)
 *
 * L'utilisateur pourra switcher vers mainnet en session via le
 * sélecteur réseau.
 *
 * **Pas de sélection testnet/mainnet en création** : les defaults
 * sont les testnets (onboarding sans fonds réels), cohérent avec
 * D-E2.3-1 et D-E2.1-2.
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

export function CreateUnified() {
  const navigate = useNavigate();
  const t = useTranslation();
  const { unlock } = useWalletStore();
  const { network } = useSdkStore();
  const copy = useClipboard();

  const [step, setStep] = useState<"form" | "reveal">("form");
  const [choice, setChoice] = useState<NetworkChoice>("sango");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  // Secrets temporaires (jamais persistés)
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [seedHex, setSeedHex] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | Bip39Wallet | null>(null);

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
    if (!ack) {
      toast.error("Confirme avoir lu l'avertissement");
      return false;
    }
    return true;
  }

  async function onGenerate() {
    if (!validateForm()) return;
    setBusy(true);
    try {
      if (cfg.format === "sango-legacy") {
        // SANGO : Ed25519 seed 32 bytes
        const seed = crypto.getRandomValues(new Uint8Array(32));
        const w = await Wallet.fromSeed(seed, network);
        const seedStr = bytesToHex(seed);
        seed.fill(0);
        setSeedHex(seedStr);
        setWallet(w);
      } else {
        // BIP-39 : mnemonic 12 mots
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
    setBusy(true);
    try {
      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();

      const id =
        wallet instanceof Wallet
          ? wallet.identity.addressHex.toLowerCase()
          : wallet.defaultAddress.toLowerCase();

      await keyring.put({
        id,
        label: label.trim() || "Mon portefeuille",
        format: cfg.format,
        networkId: cfg.networkId,
        stored,
        createdAt: Date.now(),
      });
      keyring.close();

      if (wallet instanceof Wallet) {
        unlock({
          wallet,
          id,
          format: "sango-legacy",
          networkId: cfg.networkId,
          network,
        });
      } else {
        unlock({
          wallet,
          id,
          format: "bip39",
          networkId: cfg.networkId,
        });
      }

      // Jette les références sensibles
      setMnemonic(null);
      setSeedHex(null);

      toast.success(t.create.createdAndSaved);
      navigate("/");
    } catch (err) {
      toast.error(t.create.saveError, {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  // ── Étape reveal ────────────────────────────────────────────
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
        step={{ current: 2, total: 2 }}
      >
        {isSango ? (
          <div className="mt-6 flex items-start gap-2 rounded-2xl border bg-card p-4">
            <code className="break-all font-mono text-xs leading-6">
              {seedHex}
            </code>
            <button
              type="button"
              onClick={() =>
                copy(`0x${seedHex}`, t.create.seedCopied)
              }
              className="shrink-0 rounded-lg p-2 transition-colors hover:bg-accent"
              aria-label={t.onboarding.create.copySeed}
            >
              <Copy className="size-4" />
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border bg-card p-4">
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

        <div className="mt-6 space-y-3">
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
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="size-4" />
            {busy ? t.create.saving : t.onboarding.create.revealConfirm}
          </button>
        </div>
      </AuthShell>
    );
  }

  // ── Étape form ──────────────────────────────────────────────
  return (
    <AuthShell
      title={t.onboarding.create.title}
      subtitle={t.onboarding.create.subtitle}
      backTo="/welcome"
      logoSize={56}
      step={{ current: 1, total: 2 }}
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

        {/* Ack */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border bg-muted/30 p-3">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
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
