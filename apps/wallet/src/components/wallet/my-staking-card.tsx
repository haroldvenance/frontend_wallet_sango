import {ShieldCheck, Timer} from "lucide-react";
import { Link } from "react-router-dom";

import { useMyDelegations, useMyPendingUnbondings } from "@/hooks/use-my-delegations";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, shortenAddress } from "@/lib/format";
import { SangoCoinIcon } from "@/components/branding/sango-coin-icon";

export function MyStakingCard() {
  const t = useTranslation();
  const { data: delegations, isLoading: loadingD } = useMyDelegations();
  const { data: unbondings, isLoading: loadingU } = useMyPendingUnbondings();

  const isLoading = loadingD || loadingU;
  const hasDelegations = (delegations?.length ?? 0) > 0;
  const hasUnbondings = (unbondings?.length ?? 0) > 0;

  // Aucune position → on n'affiche pas la carte
  if (!isLoading && !hasDelegations && !hasUnbondings) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{t.dashboard.stakingTitle}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.dashboard.stakingSubtitle}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {isLoading && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {t.common.loading}
          </div>
        )}

        {hasDelegations &&
          delegations!.map((d) => {
            const rewards = BigInt(d.pendingRewards);
            const bonded = BigInt(d.bonded);
            return (
              <Link
                key={`${d.validator}`}
                to={`/validators/${d.validator}`}
                className="flex items-center gap-3 border-b p-4 last:border-b-0 hover:bg-accent/40"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <SangoCoinIcon size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {t.dashboard.delegatedTo}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortenAddress(d.validator, 6)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.dashboard.bonded}: {formatSango(bonded)} ·{" "}
                    {t.dashboard.rewards}: {formatSango(rewards)}
                  </p>
                </div>
                {rewards > 0n && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                    +{formatSango(rewards)}
                  </span>
                )}
              </Link>
            );
          })}

        {hasUnbondings &&
          unbondings!.map((u) => {
            const remaining = u.matureAt * 1000 - Date.now();
            const days = Math.max(0, Math.ceil(remaining / (24 * 3600 * 1000)));
            return (
              <div
                key={`u-${u.id}`}
                className="flex items-center gap-3 border-b p-4 last:border-b-0"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Timer className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {t.dashboard.unbondingInProgress}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSango(u.amount)} SANGO ·{" "}
                    {days > 0
                      ? `${t.dashboard.inDays.replace("{n}", String(days))}`
                      : t.dashboard.mature}
                  </p>
                </div>
              </div>
            );
          })}

        {!hasUnbondings && hasDelegations && (
          <div className="flex items-center gap-2 border-t p-3 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3" />
            {t.dashboard.noUnbonding}
          </div>
        )}
      </div>
    </section>
  );
}
