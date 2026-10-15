import {
  bitcoinNetworkById,
  evmNetworkById,
} from "@sango/wallet-chains";

import { ActivitySection } from "@/components/ui/activity-section";
import { AggregatedRow } from "@/features/history/aggregated-row";
import { useAggregatedHistory } from "@/hooks/use-aggregated-history";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Activité récente **cross-chain** — Phase 9.3 (D9.3-g·A).
 *
 * Remplace `RecentActivity` (SANGO), `HistoryListEvm` et
 * `HistoryListBitcoin` dans le dashboard. Agrège 4 EVM mainnets +
 * Bitcoin + Sango, trie par statut/timestamp, dédup.
 *
 * **Phase 13-C** : la row (`AggregatedRow`) est extraite dans
 * `features/history/aggregated-row.tsx` — partagée avec l'historique
 * unifié.
 */
function humanNetworkName(id: string): string {
  return (
    evmNetworkById(id)?.name ??
    bitcoinNetworkById(id)?.name ??
    id
  );
}

export function RecentActivityAggregated() {
  const t = useTranslation();
  const { txs, loading, isFetching, sourceErrors, refetch } =
    useAggregatedHistory(10);

  const humanErrors = sourceErrors.map(humanNetworkName);

  return (
    <ActivitySection
      title={t.activity.title}
      subtitle={t.activity.subtitle}
      onRefresh={refetch}
      isRefreshing={isFetching}
    >
      {loading && txs.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      )}

      {!loading && txs.length === 0 && sourceErrors.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          {t.activity.empty}
        </div>
      )}

      {!loading && txs.length === 0 && sourceErrors.length > 0 && (
        <div className="p-6 text-center text-xs text-amber-600 dark:text-amber-400">
          {t.activity.sourcesUnavailable.replace(
            "{networks}",
            humanErrors.join(", "),
          )}
        </div>
      )}

      {txs.map((tx) => (
        <AggregatedRow key={`${tx.networkId}:${tx.txHash}`} tx={tx} />
      ))}

      {!loading && txs.length > 0 && sourceErrors.length > 0 && (
        <div className="border-t px-4 py-2 text-[10px] text-amber-600 dark:text-amber-400">
          {t.activity.sourcesUnavailable.replace(
            "{networks}",
            humanErrors.join(", "),
          )}
        </div>
      )}
    </ActivitySection>
  );
}
