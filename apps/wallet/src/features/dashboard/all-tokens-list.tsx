import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

import {
  getDisplayAssetId,
  useAllWalletAssets,
} from "@/hooks/use-all-wallet-assets";
import { useWalletAssetPrices } from "@/hooks/use-wallet-asset-prices";
import { useTranslation } from "@/i18n/use-translation";

import { WalletAssetRow } from "./wallet-asset-row";

/**
 * Liste unifiée de tous les actifs du wallet — Phase 8 (D8-g·A).
 *
 * Remplace `AssetList` / `AssetListEvm` / `BitcoinAssetList` dans le
 * dashboard. Agrége cross-chain : SANGO + Bitcoin + EVM (natif +
 * tokens).
 *
 * **Tri (D8-f·A)** :
 *   1. SANGO toujours premier (D8-b·A).
 *   2. Puis par valeur fiat **décroissante** (calculée = balance × prix).
 *   3. Actifs sans prix → à la fin, triés alphabétiquement.
 *
 * **D8-h·A** — prix absent (SANGO, tokens non listés) → `—`.
 *
 * **D8-d·A** — prix CoinGecko batchés via `useWalletAssetPrices`.
 */
export function AllTokensList() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { assets, loading } = useAllWalletAssets();
  const { prices } = useWalletAssetPrices(assets.map(getDisplayAssetId));

  const sorted = useMemo(() => {
    type Enriched = {
      asset: (typeof assets)[number];
      fiatValue: number | null;
    };
    // **Phase 9.1 (D9-e·A)** — SANGO exclu (carte dédiée).
    // **Phase 9.2 (D9-d·A)** — garde-fou production :
    //   - les natifs sont toujours visibles (ils définissent les
    //     réseaux supportés : ETH, BNB, BTC) ;
    //   - les tokens (USDC/USDT) ne sont affichés que si le solde
    //     est > 0, pour éviter 12 lignes « 0 USDT » à zéro.
    // Un solde en erreur (`balance === null`) n'est PAS traité comme
    // un solde nul — il est masqué pour ne pas mentir.
    const filtered = assets.filter((a) => {
      const id = getDisplayAssetId(a);
      if (id === "sango") return false;
      if (a.kind === "native") return true;
      return a.balance !== null && a.balance > 0n;
    });
    const enriched: Enriched[] = filtered.map((asset) => {
      const price = prices[getDisplayAssetId(asset).toLowerCase()];
      if (!price || asset.balance === null) {
        return { asset, fiatValue: null };
      }
      const num = bigintToNumber(asset.balance, asset.decimals);
      return { asset, fiatValue: num * price.usd };
    });

    enriched.sort((a, b) => {
      // Fiat décroissant.
      if (a.fiatValue !== null && b.fiatValue !== null) {
        if (a.fiatValue !== b.fiatValue) return b.fiatValue - a.fiatValue;
      } else if (a.fiatValue !== null) {
        return -1;
      } else if (b.fiatValue !== null) {
        return 1;
      }
      // Tie-break : symbole puis réseau (stable pour les 0).
      const sym = a.asset.symbol.localeCompare(b.asset.symbol);
      if (sym !== 0) return sym;
      return a.asset.networkId.localeCompare(b.asset.networkId);
    });

    return enriched;
  }, [assets, prices]);

  const count = sorted.length;
  const countLabel =
    count === 0
      ? ""
      : count === 1
        ? t.dashboard.tokens.countSingular.replace("{n}", "1")
        : t.dashboard.tokens.countPlural.replace("{n}", String(count));

  if (loading && sorted.length === 0) {
    return (
      <section>
        <header className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-base font-semibold">
            {t.dashboard.tokens.title}
          </h2>
        </header>
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      </section>
    );
  }

  return (
    <section>
      <header className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-base font-semibold">
          {t.dashboard.tokens.title}
        </h2>
        {countLabel && (
          <span className="text-xs text-muted-foreground">{countLabel}</span>
        )}
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {sorted.map(({ asset }) => (
          <WalletAssetRow
            key={`${asset.networkId}:${getDisplayAssetId(asset)}`}
            asset={asset}
            price={prices[getDisplayAssetId(asset).toLowerCase()]}
            onClick={() =>
              navigate(
                `/asset/${asset.networkId}/${getDisplayAssetId(asset)}`,
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function bigintToNumber(v: bigint, decimals: number): number {
  const base = 10n ** BigInt(decimals);
  const whole = Number(v / base);
  const frac = Number(v % base) / Number(base);
  return whole + frac;
}
