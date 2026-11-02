import { Bip39Wallet, decryptBip39Secret } from "@sango/wallet-core";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileJson,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";
import { deserializeBip39Keyfile } from "@/lib/bip39-keyfile";
import { truncateMiddle } from "@/lib/format";
import { pickJsonFile } from "@/lib/keyfile";
import { useWalletStore } from "@/stores/wallet-store";

type Phase = "idle" | "ready" | "verifying" | "success" | "error";

interface ParsedKeyfile {
  readonly stored: import("@sango/wallet-core").StoredWalletV2;
  readonly networkId: string;
  readonly exportedAt: string | null;
}

export function SettingsVerifyKeyfileRoute() {
  const t = useTranslation();
  const activeWallet = useWalletStore((s) => s.wallet);

  const [phase, setPhase] = useState<Phase>("idle");
  const [parsed, setParsed] = useState<ParsedKeyfile | null>(null);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);

  const activeAddress = tryGetActiveEvmAddress(activeWallet);

  function reset() {
    setPhase("idle");
    setParsed(null);
    setPassword("");
    setErrorMsg(null);
    setDerivedAddress(null);
  }

  async function onPickFile() {
    try {
      const raw = await pickJsonFile();

      const obj = raw as { format?: unknown };
      if (obj.format === "sango-wallet-keyfile") {
        setErrorMsg(t.settings.verifyKeyfile.v1FileDetected);
        setPhase("error");
        return;
      }

      const { stored, networkId } = deserializeBip39Keyfile(raw);
      const exportedAt =
        typeof (raw as { exportedAt?: unknown }).exportedAt === "string"
          ? (raw as { exportedAt: string }).exportedAt
          : null;

      setParsed({ stored, networkId, exportedAt });
      setPhase("ready");
    } catch {
      // Jamais le message brut : peut contenir "salt must be 16 bytes",
      // un offset de parse JSON, etc.
      setErrorMsg(t.settings.verifyKeyfile.parseFailed);
      setPhase("error");
    }
  }

  async function onVerify() {
    if (!parsed) return;
    setErrorMsg(null);
    setPhase("verifying");

    let seed: Uint8Array | null = null;
    let wallet: Bip39Wallet | null = null;
    try {
      const result = await decryptBip39Secret(parsed.stored, password);
      seed = result.seed;

      wallet = Bip39Wallet.fromSeed(seed);
      const derived = wallet.defaultAddress;
      setDerivedAddress(derived);

      if (
        derived.toLowerCase() !== parsed.stored.addressHex.toLowerCase()
      ) {
        setErrorMsg(t.settings.verifyKeyfile.deriveMismatch);
        setPhase("error");
        return;
      }

      setPhase("success");
    } catch {
      // Ne pas distinguer "mauvais mot de passe" de "corruption" :
      // message unique.
      setErrorMsg(t.settings.verifyKeyfile.wrongPassword);
      setPhase("error");
    } finally {
      // ⚠️ destroy() ET seed.fill(0) garantis même en cas d'erreur.
      if (wallet) wallet.destroy();
      if (seed) seed.fill(0);
      setPassword("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        to="/settings/recovery-phrase"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="size-3" />
        {t.settings.verifyKeyfile.back}
      </Link>

      <header className="mt-6 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileJson className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t.settings.verifyKeyfile.title}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.settings.verifyKeyfile.subtitle}
          </p>
        </div>
      </header>

      {phase === "idle" && (
        <button
          type="button"
          data-testid="pick-keyfile-button"
          onClick={() => void onPickFile()}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-card text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <FileJson className="size-4" />
          {t.settings.verifyKeyfile.selectFile}
        </button>
      )}

      {parsed &&
        (phase === "ready" ||
          phase === "verifying" ||
          phase === "success") && (
          <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <p className="text-sm font-semibold">
                {t.settings.verifyKeyfile.fileReady}
              </p>
            </div>

            <dl className="mt-4 space-y-2 text-xs">
              <Row
                label={t.settings.verifyKeyfile.fieldAddress}
                value={truncateMiddle(parsed.stored.addressHex, 10, 8)}
              />
              <Row
                label={t.settings.verifyKeyfile.fieldNetwork}
                value={parsed.networkId}
              />
              {parsed.exportedAt && (
                <Row
                  label={t.settings.verifyKeyfile.fieldExportedAt}
                  value={new Date(parsed.exportedAt).toLocaleString(
                    undefined,
                  )}
                />
              )}
            </dl>

            {phase !== "success" && (
              <>
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-xs font-medium">
                    {t.settings.verifyKeyfile.passwordLabel}
                  </span>
                  <input
                    type="password"
                    data-testid="verify-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    spellCheck={false}
                    className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  />
                </label>

                <button
                  type="button"
                  data-testid="verify-submit"
                  onClick={() => void onVerify()}
                  disabled={phase === "verifying" || password.length === 0}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
                >
                  <ShieldCheck className="size-4" />
                  {phase === "verifying"
                    ? t.settings.verifyKeyfile.verifying
                    : t.settings.verifyKeyfile.submit}
                </button>
              </>
            )}
          </div>
        )}

      {phase === "success" && parsed && (
        <div
          data-testid="verify-success"
          className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5"
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
            <p className="text-sm font-semibold">
              {t.settings.verifyKeyfile.fileReady}
            </p>
          </div>

          <dl className="mt-4 space-y-2 text-xs">
            <Row
              label={t.settings.verifyKeyfile.derivedAddress}
              value={
                derivedAddress ? truncateMiddle(derivedAddress, 10, 8) : "—"
              }
            />
          </dl>

          <p className="mt-3 text-xs text-muted-foreground">
            {activeAddress === null
              ? t.settings.verifyKeyfile.noActiveWallet
              : derivedAddress &&
                  derivedAddress.toLowerCase() === activeAddress
                ? t.settings.verifyKeyfile.matchesActive
                : t.settings.verifyKeyfile.differentWallet}
          </p>

          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border bg-background text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t.settings.verifyKeyfile.changeFile}
          </button>
        </div>
      )}

      {phase === "error" && (
        <div
          data-testid="verify-error"
          className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-5"
        >
          <div className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {t.settings.verifyKeyfile.invalidFile}
              </p>
              {errorMsg && <p className="mt-1 text-xs">{errorMsg}</p>}
            </div>
          </div>
          <button
            type="button"
            data-testid="verify-retry"
            onClick={reset}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border bg-background text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t.settings.verifyKeyfile.changeFile}
          </button>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
        <XCircle className="mt-0.5 size-3.5 shrink-0" />
        <span>{t.settings.verifyKeyfile.securityHint}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-[11px]">{value}</dd>
    </div>
  );
}

function tryGetActiveEvmAddress(wallet: unknown): string | null {
  if (
    wallet &&
    typeof wallet === "object" &&
    "defaultAddress" in wallet &&
    typeof (wallet as { defaultAddress: unknown }).defaultAddress === "string"
  ) {
    return (wallet as { defaultAddress: string }).defaultAddress.toLowerCase();
  }
  return null;
}