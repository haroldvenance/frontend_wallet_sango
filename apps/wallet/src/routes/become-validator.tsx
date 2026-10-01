import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAccount } from "@/hooks/use-account";
import { useRegisterValidator } from "@/hooks/use-staking-actions";
import { useValidators } from "@/hooks/use-validators";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, parseSango } from "@/lib/format";
import { useSangoWallet } from "@/hooks/use-sango-wallet";

/** 100 000 SANGO = 10^5 * 10^7 base units = 10^12 base units. */
const MIN_SELF_STAKE = 100_000n * 10_000_000n;

/** Commission max : 1000 bps = 10 %. */
const MAX_COMMISSION_BPS = 1_000;

export function BecomeValidatorRoute() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { data: account } = useAccount();
  const { data: validators } = useValidators();
  const wallet = useSangoWallet();
  const register = useRegisterValidator();

  const [commissionPct, setCommissionPct] = useState("7");
  const [stakeInput, setStakeInput] = useState("100000");

  // Si déjà validateur, on ne propose pas de s'enregistrer.
  const alreadyValidator = validators?.some(
    (v) => v.address === wallet?.identity.addressHex,
  );

  const walletBalance = account ? BigInt(account.balance) : 0n;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    // 1. Commission en % → bps.
    const pct = Number.parseFloat(commissionPct.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 10) {
      return toast.error(t.becomeValidator.invalidCommission);
    }
    const commissionBps = Math.round(pct * 100);
    if (commissionBps < 0 || commissionBps > MAX_COMMISSION_BPS) {
      return toast.error(t.becomeValidator.invalidCommission);
    }

    // 2. Self-stake SANGO → base units.
    let selfStakeBaseUnits: bigint;
    try {
      selfStakeBaseUnits = parseSango(stakeInput);
    } catch (err) {
      return toast.error(t.becomeValidator.invalidStake, {
        description: (err as Error).message,
      });
    }
    if (selfStakeBaseUnits < MIN_SELF_STAKE) {
      return toast.error(t.becomeValidator.stakeTooLow, {
        description: `Minimum : ${formatSango(MIN_SELF_STAKE)} SANGO`,
      });
    }
    if (selfStakeBaseUnits > walletBalance) {
      return toast.error(t.becomeValidator.insufficientBalance, {
        description: `${t.staking.maxLabel} : ${formatSango(walletBalance)} SANGO`,
      });
    }

    // 3. Register + wait.
    await register.mutateAsync({ commissionBps, selfStakeBaseUnits });
    navigate("/validators");
  }

  if (alreadyValidator) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <Link
          to="/validators"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> {t.validators.backToList}
        </Link>
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-500" />
            <h2 className="text-sm font-semibold">{t.becomeValidator.alreadyTitle}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.becomeValidator.alreadyBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link
        to="/validators"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t.validators.backToList}
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        {t.becomeValidator.title}
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {t.becomeValidator.subtitle}
      </p>

      {account && (
        <p className="mt-4 text-xs text-muted-foreground">
          {t.staking.available} : {formatSango(walletBalance)} SANGO
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium">{t.becomeValidator.commissionLabel}</span>
          <input
            type="text"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            placeholder="7"
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t.becomeValidator.commissionHelp}
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium">{t.becomeValidator.stakeLabel}</span>
          <input
            type="text"
            value={stakeInput}
            onChange={(e) => setStakeInput(e.target.value)}
            placeholder="100000"
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t.becomeValidator.stakeHelp} : {formatSango(MIN_SELF_STAKE)} SANGO
          </span>
        </label>

        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>{t.becomeValidator.warning}</span>
        </div>

        <button
          type="submit"
          disabled={register.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ShieldCheck className="size-4" />
          {register.isPending ? t.staking.sending : t.becomeValidator.button}
        </button>
      </form>
    </div>
  );
}
