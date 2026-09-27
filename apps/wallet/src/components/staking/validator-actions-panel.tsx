import type { ValidatorInfo } from "@sango/rpc";
import { AlertTriangle, Coins, Lock, Pencil, ShieldAlert, Unlock } from "lucide-react";

import { useTranslation } from "@/i18n/use-translation";
import { formatSango } from "@/lib/format";

interface Props {
  validator: ValidatorInfo;
  onBond: () => void;
  onUnbond: () => void;
  onUpdateCommission: () => void;
  onUnjail: () => void;
  pending: {
    bond: boolean;
    unbond: boolean;
    updateCommission: boolean;
    unjail: boolean;
  };
}

/** Panneau "Mon validateur" — actions réservées au propriétaire. */
export function ValidatorActionsPanel({
  validator,
  onBond,
  onUnbond,
  onUpdateCommission,
  onUnjail,
  pending,
}: Props) {
  const t = useTranslation();
  const s = t.staking;

  const hasPendingCommission =
    validator.pendingCommissionBps !== null &&
    validator.pendingCommissionAt !== null;

  const anyPending = Object.values(pending).some(Boolean);

  return (
    <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <Lock className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">{s.panelTitle}</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{s.panelSubtitle}</p>

      {/* Stats ligne */}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {s.selfStake}
          </dt>
          <dd className="mt-0.5 font-medium">{formatSango(validator.selfStake)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {s.totalDelegated}
          </dt>
          <dd className="mt-0.5 font-medium">{formatSango(validator.totalDelegated)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {s.commission}
          </dt>
          <dd className="mt-0.5 font-medium">
            {(validator.commissionBps / 100).toFixed(2)} %
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {s.downtimeMissed}
          </dt>
          <dd className="mt-0.5 font-medium">{validator.downtimeMissed}</dd>
        </div>
      </dl>

      {hasPendingCommission && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>
            {s.pendingCommission}: {((validator.pendingCommissionBps ?? 0) / 100).toFixed(2)} %
            {validator.pendingCommissionAt && (
              <> — {s.appliesAt} {new Date(validator.pendingCommissionAt * 1000).toLocaleString()}</>
            )}
          </span>
        </div>
      )}

      {validator.jailed && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-2.5 text-[11px] text-destructive">
          <ShieldAlert className="mt-0.5 size-3 shrink-0" />
          <span>
            {s.jailedBanner}
            {validator.jailedUntil && (
              <> — {s.until} {new Date(validator.jailedUntil * 1000).toLocaleString()}</>
            )}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBond}
          disabled={pending.bond || anyPending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Lock className="size-4" /> {s.bond}
        </button>

        {BigInt(validator.selfStake) > 0n && (
          <button
            type="button"
            onClick={onUnbond}
            disabled={pending.unbond || anyPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium disabled:opacity-50"
          >
            <Unlock className="size-4" /> {s.unbond}
          </button>
        )}

        <button
          type="button"
          onClick={onUpdateCommission}
          disabled={pending.updateCommission || anyPending || hasPendingCommission}
          title={hasPendingCommission ? s.pendingCommissionHint : undefined}
          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium disabled:opacity-50"
        >
          <Pencil className="size-4" /> {s.updateCommission}
        </button>

        {validator.jailed && (
          <button
            type="button"
            onClick={onUnjail}
            disabled={pending.unjail || anyPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 text-sm font-medium text-destructive disabled:opacity-50"
          >
            <ShieldAlert className="size-4" /> {s.unjail}
          </button>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Coins className="size-3" />
        {s.panelFooter}
      </p>
    </div>
  );
}
