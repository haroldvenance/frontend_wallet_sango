import type { AddressHex } from "@sango/types";
import { Plus, ShieldCheck, ShieldAlert, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useValidators } from "@/hooks/use-validators";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, shortenAddress } from "@/lib/format";

export function ValidatorsRoute() {
  const t = useTranslation();
  const { data: validators, isLoading, isError, error } = useValidators();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t.validators.subtitle}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.validators.title}</h1>
        </div>
        <Link
          to="/become-validator"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-4" /> {t.becomeValidator.cta}
        </Link>
      </div>

      {isLoading && (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {validators && validators.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t.validators.empty}</p>
        </div>
      )}

      {validators && validators.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t.validators.colAddress}</th>
                <th className="px-4 py-3 font-medium">{t.validators.colVotingPower}</th>
                <th className="px-4 py-3 font-medium">{t.validators.colCommission}</th>
                <th className="px-4 py-3 font-medium">{t.validators.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {validators.map((v) => (
                <tr key={v.address} className="border-b last:border-b-0 hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link
                      to={`/validators/${v.address}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {shortenAddress(v.address)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatSango(v.votingPower)} <span className="text-muted-foreground">SANGO</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{(v.commissionBps / 100).toFixed(2)} %</td>
                  <td className="px-4 py-3">
                    {v.jailed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                        <ShieldAlert className="size-3" /> {t.validators.jailed}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                        <ShieldCheck className="size-3" /> {t.validators.active}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
