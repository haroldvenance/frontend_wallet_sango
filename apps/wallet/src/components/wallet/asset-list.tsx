import { Database } from "lucide-react";

import { SangoCoinIcon } from "@/components/branding/sango-coin-icon";
import { useAccount } from "@/hooks/use-account";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango } from "@/lib/format";

export function AssetList() {
  const t = useTranslation();
  const { data: account, isLoading } = useAccount();

  const balance = account
    ? formatSango(account.balance)
    : isLoading
      ? "…"
      : "0.0000000";

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{t.assets.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.assets.subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          1 {t.assets.asset}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <SangoCoinIcon size={40} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">SANGO</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t.assets.native}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t.assets.sangoName}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-mono text-sm font-medium">{balance}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              SANGO
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Database className="size-3.5" />
        <span>
          {t.assets.onChainVia} <code>sango_getAccount</code>
        </span>
      </div>
    </section>
  );
}
