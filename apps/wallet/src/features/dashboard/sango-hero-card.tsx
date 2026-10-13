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

/**
 * Grande carte SANGO du dashboard — Phase 9.1 (D9-b·A).
 *
 * **D9-b** — mise en évidence du coin natif de la plateforme. Clic →
 * `/asset/sango`.
 *
 * **Source de vérité** : `useAllWalletAssets` — pas `useAccount`.
 * Raison : `useAccount()` est désactivé pour les wallets V2
 * (`format === "bip39"`), alors que `useAllWalletAssets` dérive
 * l'identité SANGO depuis la mnemonic via SLIP-0010.
 *
 * Si SANGO est introuvable dans l'agrégat (wallet non déverrouillé),
 * la carte retourne `null`.
 */
export function SangoHeroCard() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { assets, loading } = useAllWalletAssets();

  const sango = assets.find((a) => getDisplayAssetId(a) === "sango");
  if (!sango && !loading) return null;

  const balanceStr = sango?.balance !== null && sango?.balance !== undefined
    ? formatSango(sango.balance)
    : loading
      ? "…"
      : "0";

  return (
    <button
      type="button"
      data-testid="sango-hero-card"
      onClick={() => navigate("/asset/sango-devnet/sango")}
      className="group relative w-full overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.08] via-card to-emerald-500/[0.05] p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg sm:p-8"
    >
      {/* Halos */}
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
            Disponible
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
