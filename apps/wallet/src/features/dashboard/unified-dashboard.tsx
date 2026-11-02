import { bitcoinNetworkById, evmNetworkById } from "@sango/wallet-chains";

import { WalletSwitcher } from "@/features/wallet/wallet-switcher";
import { QuickActions } from "@/components/wallet/quick-actions";
import { QuickActionsBitcoin } from "@/features/bitcoin/quick-actions-bitcoin";
import { QuickActionsEvm } from "@/features/evm/quick-actions-evm";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

import { AllTokensList } from "./all-tokens-list";
import { RecentActivityAggregated } from "./recent-activity-aggregated";
import { NetworkCard } from "./network-card";
import { SangoHeroCard } from "./sango-hero-card";

/**
 * Dashboard unifié — Phase 9.1.
 *
 * Ordre :
 *   1. WalletSwitcher     — identité du wallet
 *   2. Actions            — Envoyer / Recevoir (par famille)
 *   3. SangoHeroCard      — coin natif mis en avant
 *   4. NetworkCard        — réseau actif + changement
 *   5. AllTokensList      — actifs cross-chain (hors SANGO)
 *   6. Activité récente   — agrégat cross-chain
 */
export function UnifiedDashboard() {
  const t = useTranslation();
  const family = useWalletStore((s) => s.family);
  const networkId = useWalletStore((s) => s.networkId);

  const isSango = family === "sango";
  const isBitcoin = family === "bitcoin";

  // TODO(i18n) : extraire `Wallet Bitcoin` / `Wallet EVM` en clés
  // `t.dashboard.walletBitcoin` / `t.dashboard.walletEvm`. En attendant,
  // concaténation structurelle qui n'expose rien de technique.
  const subtitle = (() => {
    if (isSango) return t.dashboard.overview;
    if (isBitcoin) {
      const name = bitcoinNetworkById(networkId)?.name ?? networkId;
      return `Wallet Bitcoin · ${name}`;
    }
    const name = evmNetworkById(networkId)?.name ?? networkId;
    return `Wallet EVM · ${name}`;
  })();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {t.dashboard.title}
        </h1>
      </div>

      <div className="space-y-6">
        <WalletSwitcher />

        {isSango && <QuickActions />}
        {family === "evm" && <QuickActionsEvm />}
        {isBitcoin && <QuickActionsBitcoin />}

        <SangoHeroCard />

        <NetworkCard />

        <AllTokensList />

        <RecentActivityAggregated />
      </div>
    </div>
  );
}