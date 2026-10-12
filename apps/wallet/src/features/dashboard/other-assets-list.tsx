import { useState } from "react";

import { AssetLogo } from "@/components/branding/asset-logo";
import {
  AssetSection,
  type AssetItem,
} from "@/components/ui/asset-section";
import { useUnifiedAssets, type UnifiedAsset } from "@/hooks/use-unified-assets";
import { useWallets } from "@/hooks/use-wallets";
import { useTranslation } from "@/i18n/use-translation";
import { formatBitcoin } from "@/lib/bitcoin";
import { formatTokenAmount } from "@/lib/eth";
import { formatSango } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

import { WalletsAndAccountsModal } from "@/features/wallet/wallets-and-accounts-modal";

/**
 * Section "Autres cryptos" — Phase 4 (mockup-faithful).
 *
 * Agrège les balances **natives + tokens** de tous les wallets
 * déverrouillés **sauf le wallet actif** (D1·A, D6·A). Cliquer sur une
 * ligne bascule ce wallet en actif (D4·A). Le bouton "Gérer" ouvre la
 * modale Phase 3 (D8·A).
 *
 * **D7·A** — `null` si moins de 2 wallets déverrouillés.
 * **D5·B** — tri fixe (ETH, BTC, USDC, USDT, BNB), géré par le hook.
 * **D12·A** — fetch + cache 30s géré par React Query dans le hook.
 */
export function OtherAssetsList() {
  const t = useTranslation();
  const { wallets, activeWalletId } = useWallets();
  const { assets, loading } = useUnifiedAssets();
  const switchWallet = useWalletStore((s) => s.switchWallet);
  const [modalOpen, setModalOpen] = useState(false);

  // D7·A — au moins 2 wallets pour que la section ait du sens.
  if (wallets.length < 2 || !activeWalletId) return null;

  const items: AssetItem[] = assets.map((a) => ({
    id: a.id,
    icon: assetIcon(a),
    symbol: a.symbol,
    name: a.subtitle,
    balance: formatAssetBalance(a),
    onClick: () => handleSelect(a.walletId),
  }));

  function handleSelect(walletId: string) {
    if (walletId === activeWalletId) return;
    switchWallet(walletId);
  }

  return (
    <>
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-sm font-semibold">
            {t.dashboard.otherAssets.title}
          </h2>
          <button
            type="button"
            data-testid="other-assets-manage"
            onClick={() => setModalOpen(true)}
            className="text-xs font-semibold text-primary transition-colors hover:underline"
          >
            {t.dashboard.otherAssets.manage}
          </button>
        </div>

        <AssetSection
          title=""
          items={items}
          loading={loading && items.length === 0}
          emptyMessage={t.dashboard.otherAssets.empty}
        />
      </section>

      <WalletsAndAccountsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function assetIcon(a: UnifiedAsset) {
  const assetId =
    a.assetRef.kind === "native" ? a.assetRef.assetId : a.symbol;
  return <AssetLogo assetId={assetId} fallbackSymbol={a.symbol} size={40} />;
}

function formatAssetBalance(a: UnifiedAsset): string {
  // Phase 4.2 (D1·A) — fallback UI `0`. L'erreur RPC reste
  // conservée côté query (`isError` non exposé en 4.2). Le timeout
  // RPC court sera traité en 4.3.
  if (a.balance === null) return "0";
  if (a.kind === "token") return formatTokenAmount(a.balance, a.decimals);
  if (a.family === "sango") return formatSango(a.balance);
  if (a.family === "bitcoin") return formatBitcoin(a.balance);
  return formatTokenAmount(a.balance, a.decimals);
}
