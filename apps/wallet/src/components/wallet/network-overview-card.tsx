import { Boxes, Wifi } from "lucide-react";

import { useChainInfo } from "@/hooks/use-chain-info";
import { useRecentBlocks } from "@/hooks/use-recent-blocks";
import { useTranslation } from "@/i18n/use-translation";
import { shortenHash } from "@/lib/format";

export function NetworkOverviewCard() {
  const t = useTranslation();
  const { data: chainInfo, isError: chainError } = useChainInfo();
  const { data: blocks, isLoading: blocksLoading, isError: blocksError } = useRecentBlocks(5);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{t.dashboard.networkTitle}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.dashboard.networkSubtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Chaîne */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Wifi className="size-4 text-emerald-500" />
            <span className="text-xs font-medium">{t.dashboard.chainInfo}</span>
          </div>
          {chainError && (
            <p className="mt-3 text-xs text-destructive">{t.network.offline}</p>
          )}
          {chainInfo && (
            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.dashboard.height}</dt>
                <dd className="font-mono">{chainInfo.height ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.dashboard.validators}</dt>
                <dd className="font-mono">{chainInfo.validatorCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.dashboard.version}</dt>
                <dd className="font-mono">v{chainInfo.protocolVersion}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.dashboard.chainId}</dt>
                <dd className="font-mono">{shortenHash(chainInfo.chainId, 6)}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Derniers blocs */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-primary" />
            <span className="text-xs font-medium">{t.dashboard.latestBlocks}</span>
          </div>
          {blocksLoading && (
            <p className="mt-3 text-xs text-muted-foreground">{t.common.loading}</p>
          )}
          {blocksError && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t.dashboard.blocksUnavailable}
            </p>
          )}
          {blocks && (
            <ul className="mt-3 space-y-1.5 text-xs">
              {blocks.map((b) => {
                const height = Number.parseInt(b.number, 16);
                return (
                  <li key={b.hash} className="flex items-center justify-between">
                    <span className="font-mono text-muted-foreground">
                      #{height}
                    </span>
                    <span className="font-mono">{shortenHash(b.hash, 6)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
