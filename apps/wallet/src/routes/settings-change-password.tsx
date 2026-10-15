import {
  changeKeyringPassword,
  type ChangeKeyringPasswordError,
} from "@sango/wallet-core";
import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page "Changer le mot de passe" — Phase 11.2.
 *
 * **Parcours (D11.2-h = B1)** :
 *   1. Formulaire : actuel + nouveau + confirmation.
 *   2. Validation locale (longueur, match, ≠ actuel).
 *   3. `changeKeyringPassword` (3 phases — voir wallet-core).
 *   4. Écran de succès **avant** verrouillage (le wallet reste
 *      déverrouillé tant que l'utilisateur n'a pas cliqué "Compris").
 *   5. Clic "Compris" → `lock()` + navigation `/unlock`.
 *
 * **Cas particulier** — `status: "warning"` : le mot de passe a bien
 * été changé, mais la vérification post-commit a échoué. On affiche
 * quand même l'écran de succès, avec un bandeau d'avertissement
 * demandant à l'utilisateur de confirmer en se déverrouillant.
 */
type Phase = "form" | "success";

export function SettingsChangePasswordRoute() {
  const t = useTranslation();
  const navigate = useNavigate();
  const lock = useWalletStore((s) => s.lock);

  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function errorMessage(reason: ChangeKeyringPasswordError): string {
    switch (reason) {
      case "empty-keyring":
        return t.settings.password.errors.emptyKeyring;
      case "wrong-current-password":
        return t.settings.password.errors.wrongCurrent;
      case "invalid-new-password":
        return t.settings.password.errors.tooShort;
      case "same-as-current":
        return t.settings.password.errors.sameAsCurrent;
      case "reencrypt-failed":
      case "write-failed":
      case "verify-failed":
        return t.settings.password.errors.generic;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setWarning(null);

    if (next.length < 8) {
      setError(t.settings.password.errors.tooShort);
      return;
    }
    if (next !== confirm) {
      setError(t.settings.password.errors.mismatch);
      return;
    }
    if (next === current) {
      setError(t.settings.password.errors.sameAsCurrent);
      return;
    }

    setBusy(true);
    let result;
    try {
      result = await changeKeyringPassword({
        currentPassword: current,
        newPassword: next,
      });
    } finally {
      setBusy(false);
    }

    if (result.status === "error") {
      setError(errorMessage(result.reason));
      return;
    }

    if (result.status === "warning") {
      setWarning(result.message);
    }
    // Zéroïse les champs (secrets en clair).
    setCurrent("");
    setNext("");
    setConfirm("");
    setPhase("success");
  }

  function onAcknowledge() {
    // Ordre volontaire : d'abord navigate (pour éviter que
    // ProtectedLayout redirige avant), puis lock.
    navigate("/unlock", { replace: true });
    lock();
  }

  if (phase === "success") {
    return <SuccessView warning={warning} onAcknowledge={onAcknowledge} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {t.settings.password.back}
      </Link>

      <header className="mt-6 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t.settings.password.changeTitle}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.settings.password.changeIntro}
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field
          testId="cp-current"
          label={t.settings.password.currentLabel}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <Field
          testId="cp-new"
          label={t.settings.password.newLabel}
          value={next}
          onChange={setNext}
          autoComplete="new-password"
        />
        <Field
          testId="cp-confirm"
          label={t.settings.password.confirmLabel}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        {error && (
          <p
            data-testid="cp-error"
            className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          data-testid="cp-submit"
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ShieldCheck className="size-4" />
          {busy ? t.settings.password.submitting : t.settings.password.submit}
        </button>
      </form>
    </div>
  );
}

function Field(props: {
  readonly testId: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{props.label}</span>
      <input
        type="password"
        data-testid={props.testId}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        spellCheck={false}
        className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      />
    </label>
  );
}

function SuccessView(props: {
  readonly warning: string | null;
  readonly onAcknowledge: () => void;
}) {
  const t = useTranslation();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <header className="mt-6 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1
            data-testid="cp-success-title"
            className="text-2xl font-bold tracking-tight"
          >
            {t.settings.password.successTitle}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.settings.password.successBody}
          </p>
        </div>
      </header>

      {props.warning && (
        <div
          data-testid="cp-warning"
          className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{props.warning}</span>
        </div>
      )}

      <button
        type="button"
        data-testid="cp-acknowledge"
        onClick={props.onAcknowledge}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <ShieldCheck className="size-4" />
        {t.settings.password.successAcknowledge}
      </button>
    </div>
  );
}
