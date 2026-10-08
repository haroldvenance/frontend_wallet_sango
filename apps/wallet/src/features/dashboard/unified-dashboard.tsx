import { bitcoinNetworkById, evmNetworkById } from "@sango/wallet-chains";

import { BitcoinComingSoon } from "@/components/branding/bitcoin-coming-soon";
import { AssetList } from "@/components/wallet/asset-list";
import { BalanceCard } from "@/components/wallet/balance-card";
import { MyStakingCard } from "@/components/wallet/my-staking-card";
import { NetworkOverviewCard } from "@/components/wallet/network-overview-card";
import { QuickActions } from "@/components/wallet/quick-actions";
import { RecentActivity } from "@/components/wallet/recent-activity";
import { BitcoinAssetList } from "@/features/bitcoin/bitcoin-asset-list";
import { WalletSwitcher } from "@/features/wallet/wallet-switcher";
import { QuickActionsBitcoin } from "@/features/bitcoin/quick-actions-bitcoin";
import { BitcoinBalanceCard } from "@/features/bitcoin/bitcoin-balance-card";
import { AssetListEvm } from "@/features/evm/asset-list-evm";
import { BalanceCardEvm } from "@/features/evm/balance-card-evm";
import { HistoryListEvm } from "@/features/evm/history-list-evm";
import { QuickActionsEvm } from "@/features/evm/quick-actions-evm";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Dashboard unifié SANGO + EVM + Bitcoin (E2.1.b.6.2).
 *
 * **D-E2.1-18** — dispatch sur `family` (dérivée de `networkId`), pas
 * sur `format`. `format === "bip39"` couvre EVM **et** Bitcoin :
 * ce n'est pas un discriminant valide pour la famille.
 *
 * Slot par slot :
 *
 *   ActionsRow   → QuickActions | QuickActionsEvm | QuickActionsBitcoin
 *   HeroCard     → BalanceCard | BalanceCardEvm | BitcoinBalanceCard
 *   AssetSection → AssetList  | AssetListEvm  | BitcoinAssetList
 *   Activity     → RecentActivity | HistoryListEvm | ComingSoon
 *   Staking      → MyStakingCard | (absent)
 *   NetworkInfo  → NetworkOverviewCard | (absent)
 *
 * Le slot Bitcoin "Activité" reste un placeholder (ComingSoon)
 * jusqu'à un futur patch history Bitcoin.
 */
export function UnifiedDashboard() {
  const t = useTranslation();
  const family = useWalletStore((s) => s.family);
  const networkId = useWalletStore((s) => s.networkId);

  const isSango = family === "sango";
  const isBitcoin = family === "bitcoin";

  const subtitle = isSango
    ? t.dashboard.overview
    : isBitcoin
      ? `Wallet Bitcoin · ${bitcoinNetworkById(networkId)?.name ?? networkId}`
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
        {/* Actions rapides */}
        {isSango && <QuickActions />}
        {family === "evm" && <QuickActionsEvm />}
        {isBitcoin && <QuickActionsBitcoin />}

        {/* Hero card (solde + adresse) */}
        {isSango && <BalanceCard />}
        {family === "evm" && <BalanceCardEvm />}
        {isBitcoin && <BitcoinBalanceCard />}

        {/* Card wallet unifiée (Phase 3.3, D1·A). Affiche wallet +
            compte actif en une ligne. `useWallets().activeWallet` est
            null après lock() → cachée. */}
        <WalletSwitcher />

        {/* Assets */}
        {isSango && <AssetList />}
        {family === "evm" && <AssetListEvm />}
        {isBitcoin && <BitcoinAssetList />}

        {/* Staking (SANGO uniquement) */}
        {isSango && <MyStakingCard />}

        {/* Activité récente */}
        {isSango && <RecentActivity />}
        {family === "evm" && <HistoryListEvm />}
        {isBitcoin && <BitcoinComingSoon feature="Activité" />}

        {/* Réseau SANGO (height, validators — SANGO uniquement) */}
        {isSango && <NetworkOverviewCard />}
      </div>
    </div>
  );
}
