import { AssetLogo } from "@/components/branding/asset-logo";
import { NetworkLogo } from "@/components/branding/network-logo";
import type { AssetPriceInfo } from "@/hooks/use-wallet-asset-prices";
import { getDisplayAssetId } from "@/hooks/use-all-wallet-assets";
import type { WalletAsset } from "@/hooks/use-all-wallet-assets";
import { formatBitcoin } from "@/lib/bitcoin";
import { formatTokenAmount } from "@/lib/eth";
import { formatSango } from "@/lib/format";

interface Props {
  readonly asset: WalletAsset;
  readonly price: AssetPriceInfo | undefined;
  readonly onClick: () => void;
}

/**
 * Ligne d'actif style Trust Wallet — Phase 8.
 *
 * Layout :
 *   ┌────────────────────────────────────────────┐
 *   │ [logo+badge] Ethereum ✓         $0.00      │
 *   │              $2,501.45 · -1.29%  0 ETH     │
 *   └────────────────────────────────────────────┘
 *
 * **SANGO en évidence** (D8-b·A) : bordure primary + fond teinté.
 */
export function WalletAssetRow({ asset, price, onClick }: Props) {
  const isSango = getDisplayAssetId(asset) === "sango";

  // ── Balance formatée ──────────────────────────────────
  const balanceStr = (() => {
    if (asset.balance === null) return "0";
    if (asset.family === "sango") return formatSango(asset.balance);
    if (asset.family === "bitcoin") return formatBitcoin(asset.balance);
    return formatTokenAmount(asset.balance, asset.decimals);
  })();

  // ── Valeur fiat ───────────────────────────────────────
  const fiatValue = (() => {
    if (!price || asset.balance === null) return null;
    const num = bigintToNumber(asset.balance, asset.decimals);
    return num * price.usd;
  })();

  const priceStr = price ? formatUsd(price.usd) : "—";
  const fiatValueStr = fiatValue !== null ? formatUsd(fiatValue) : "$0.00";

  const changePositive = (price?.change24hPct ?? 0) >= 0;
  const changeStr =
    price?.change24hPct !== undefined && price?.change24hPct !== null
      ? `${changePositive ? "+" : ""}${price.change24hPct.toFixed(2)}%`
      : null;

  return (
    <button
      type="button"
      data-testid={`wallet-asset-row-${getDisplayAssetId(asset)}`}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 border-b p-4 text-left transition-colors last:border-b-0",
        isSango
          ? "border-primary/20 bg-primary/[0.04] hover:bg-primary/[0.08]"
          : "border-border hover:bg-accent/40",
      ].join(" ")}
    >
      {/* Logo + badge réseau */}
      <div className="relative shrink-0">
        <AssetLogo assetId={getDisplayAssetId(asset)} size={44} />
        {/* Badge réseau — taille 22, ring plus épais pour bien le
            détacher du logo sous-jacent. */}
        <div className="absolute -bottom-1.5 -right-1.5 rounded-full bg-card p-0.5 ring-2 ring-card">
          <NetworkLogo networkId={asset.networkId} size={22} />
        </div>
      </div>

      {/* Nom + prix */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{asset.symbol}</p>
          {isSango && (
            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
              NATIF
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{priceStr}</span>
          {changeStr && (
            <>
              <span>·</span>
              <span
                className={
                  changePositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                {changeStr}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Valeur fiat + balance crypto */}
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold">{fiatValueStr}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {balanceStr}{" "}
          <span className="text-[10px]">{asset.symbol}</span>
        </p>
      </div>
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function bigintToNumber(v: bigint, decimals: number): number {
  const base = 10n ** BigInt(decimals);
  const whole = Number(v / base);
  const frac = Number(v % base) / Number(base);
  return whole + frac;
}

function formatUsd(v: number): string {
  if (v === 0) return "$0.00";
  if (v > 0 && v < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: v < 1 ? 6 : 2,
  }).format(v);
}
