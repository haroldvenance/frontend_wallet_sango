import { bitcoinNetworkById, evmNetworkById } from "@sango/wallet-chains";

import { HistoryListBitcoin } from "@/features/bitcoin/history-list-bitcoin";
import { RecentActivity } from "@/components/wallet/recent-activity";
import { WalletSwitcher } from "@/features/wallet/wallet-switcher";
import { QuickActions } from "@/components/wallet/quick-actions";
import { QuickActionsBitcoin } from "@/features/bitcoin/quick-actions-bitcoin";
import { QuickActionsEvm } from "@/features/evm/quick-actions-evm";
import { HistoryListEvm } from "@/features/evm/history-list-evm";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

import { AllTokensList } from "./all-tokens-list";
import { NetworkCard } from "./network-card";
import { SangoHeroCard } from "./sango-hero-card";

/**
 * Dashboard unifié — Phase 9.1.
 *
 * **Ordre des sections** (D9-a → i) :
 *   1. WalletSwitcher        — identité du portefeuille actif
 *   2. Actions               — Acheter / Échanger / Envoyer / Recevoir
 *   3. SangoHeroCard         — coin natif de la plateforme, mis en avant
 *   4. NetworkCard           — réseau actif + bouton "Changer"
 *   5. AllTokensList         — actifs cross-chain (hors SANGO)
 *   6. Activité récente      — dispatch par famille (agrégat en 9.3)
 *
 * **Retirés du dashboard principal** (D9-g·A, D9-h·A) :
 *   - `MyStakingCard` — reste accessible via `/validators`.
 *   - `NetworkOverviewCard` — info réseau dans `/settings` (network card).
 *   - `OtherAssetsList` — redondant avec `WalletSwitcher`.
 *   - Anciens `BalanceCard*` / `AssetList*` — remplacés par `SangoHeroCard`
 *     + `AllTokensList`.
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

      <div className="space-y-6">
        {/* 1. WalletSwitcher — identité du portefeuille */}
        <WalletSwitcher />

        {/* 2. Actions rapides */}
        {isSango && <QuickActions />}
        {family === "evm" && <QuickActionsEvm />}
        {isBitcoin && <QuickActionsBitcoin />}

        {/* 3. Grande carte SANGO — coin natif mis en avant */}
        <SangoHeroCard />

        {/* 4. Carte réseau actif + changement */}
        <NetworkCard />

        {/* 5. Tokens cross-chain (SANGO exclu — cf. carte 3) */}
        <AllTokensList />

        {/* 6. Activité récente — par famille (agrégat en 9.3) */}
        {isSango && <RecentActivity />}
        {family === "evm" && <HistoryListEvm />}
        {isBitcoin && <HistoryListBitcoin />}
      </div>
    </div>
  );
}
