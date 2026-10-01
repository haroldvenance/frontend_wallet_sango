import { evmNetworkById } from "@sango/wallet-chains";

import { AssetList } from "@/components/wallet/asset-list";
import { BalanceCard } from "@/components/wallet/balance-card";
import { MyStakingCard } from "@/components/wallet/my-staking-card";
import { NetworkOverviewCard } from "@/components/wallet/network-overview-card";
import { QuickActions } from "@/components/wallet/quick-actions";
import { RecentActivity } from "@/components/wallet/recent-activity";
import { AssetListEvm } from "@/features/evm/asset-list-evm";
import { BalanceCardEvm } from "@/features/evm/balance-card-evm";
import { HistoryListEvm } from "@/features/evm/history-list-evm";
import { QuickActionsEvm } from "@/features/evm/quick-actions-evm";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Dashboard unifié SANGO + EVM (UX-1).
 *
 * Un seul layout visuel pour les deux formats. Dispatch slot par slot :
 *
 *   ActionsRow    → QuickActions (SANGO) | QuickActionsEvm
 *   HeroCard      → BalanceCard (SANGO) | BalanceCardEvm
 *   AssetSection  → AssetList (SANGO)   | AssetListEvm
 *   Activity      → RecentActivity      | HistoryListEvm
 *   Staking       → MyStakingCard       | (absent)
 *   NetworkInfo   → NetworkOverviewCard | (absent)
 *
 * La cohérence visuelle est assurée par les composants UI universels
 * (`HeroAssetCard`, `AssetSection`, `ActionsRow`, `ActivitySection`).
 *
 * **Aucun changement de modèle** — wallet-store reste la source de
 * vérité pour `format` et `networkId`.
 */
export function UnifiedDashboard() {
  const t = useTranslation();
  const format = useWalletStore((s) => s.format);
  const networkId = useWalletStore((s) => s.networkId);
  const isSango = format === "sango-legacy";

  const subtitle = isSango
    ? t.dashboard.overview
    : `Wallet EVM · ${evmNetworkById(networkId)?.name ?? networkId}`;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {t.dashboard.title}
        </h1>
      </div>

      <div className="space-y-8">
        {/* Actions */}
        {isSango ? <QuickActions /> : <QuickActionsEvm />}

        {/* Hero card (solde + adresse) */}
        {isSango ? <BalanceCard /> : <BalanceCardEvm />}

        {/* Assets */}
        {isSango ? <AssetList /> : <AssetListEvm />}

        {/* Staking (SANGO uniquement) */}
        {isSango && <MyStakingCard />}

        {/* Activité récente */}
        {isSango ? <RecentActivity /> : <HistoryListEvm />}

        {/* Réseau SANGO (height, validators — SANGO uniquement) */}
        {isSango && <NetworkOverviewCard />}
      </div>
    </div>
  );
}
