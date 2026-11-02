import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AssetLogo } from "@/components/branding/asset-logo";
import { FiatLine } from "@/components/branding/fiat-line";
import {
  getDisplayAssetId,
  useAllWalletAssets,
} from "@/hooks/use-all-wallet-assets";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Carte SANGO du dashboard.
 *
 * **N'est affichée que si pertinente** :
 *   - wallet actif = famille SANGO, OU
 *   - un solde SANGO > 0 existe (portefeuille BIP-39 qui contient du
 *     SANGO).
 *
 * Sinon `null` — évite de suggérer à un utilisateur EVM/BTC pur qu'il
 * détient du SANGO.
 */
export function SangoHeroCard() {
  const t = useTranslation();
  const navigate = useNavigate();
  const family = useWalletStore((s) => s.family);
  const networkId = useWalletStore((s) => s.networkId);
  const { assets, loading } = useAllWalletAssets();

  const sango = assets.find((a) => getDisplayAssetId(a) === "sango");

  const hasSangoBalance =
    sango?.balance !== null &&
    sango?.balance !== undefined &&
    sango.balance > 0n;
  const isSangoFamily = family === "sango";

  // Cas : chargement → placeholder. Sinon : ne rien afficher si
  // l'utilisateur n'est pas sur SANGO et n'a pas de solde SANGO.
  if (!loading && !isSangoFamily && !hasSangoBalance) {
    return null;
  }

  const balanceStr = (() => {
    if (sango?.balance !== null && sango?.balance !== undefined) {
      return formatSango(sango.balance);
    }
    return loading ? "…" : "0";
  })();

  // Navigation vers l'asset SANGO — on garde le networkId effectif du
  // wallet (pas de hardcode "sango-devnet" : pourrait diverger si un
  // mainnet SANGO arrive).
  const target = isSangoFamily
    ? `/asset/${networkId}/sango`
    : "/asset/sango-devnet/sango";

  return (
    <button
      type="button"
      data-testid="sango-hero-card"
      onClick={() => navigate(target)}
      aria-label={`SANGO — ${balanceStr} ${t.assets.sangoName}`}
      className="group relative w-full overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.08] via-card to-emerald-500/[0.05] p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-emerald-500/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AssetLogo assetId="sango" size={48} />
            <div>
              <p className="text-base font-semibold tracking-tight">SANGO</p>
              <p className="text-xs text-muted-foreground">
                {t.dashboard.sangoCard.subtitle}
              </p>
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t.assets.availableBalance}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {balanceStr}{" "}
            <span className="text-base font-normal text-muted-foreground">
              SANGO
            </span>
          </p>
          {sango?.balance !== undefined && sango?.balance !== null && (
            <p className="mt-2 text-sm text-muted-foreground">
              <FiatLine baseUnits={sango.balance} />
            </p>
          )}
        </div>
      </div>
    </button>
  );
}