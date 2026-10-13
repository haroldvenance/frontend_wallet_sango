import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Copy,
  Repeat,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AssetLogo } from "@/components/branding/asset-logo";
import { ReceiveAssetModal } from "@/components/wallet/receive-asset-modal";
import { AssetChart } from "@/features/asset/asset-chart";
import { useAssetDetail } from "@/hooks/use-asset-detail";
import {
  useAssetPrice,
  type Timeframe,
} from "@/hooks/use-asset-price";
import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslation } from "@/i18n/use-translation";
import { formatBitcoin } from "@/lib/bitcoin";
import { formatTokenAmount } from "@/lib/eth";
import { formatSango, truncateMiddle } from "@/lib/format";

/**
 * Page dédiée par actif — Phase 6.
 *
 * Résout l'actif dans le **contexte courant** (D6-c·A) :
 * `family` + `networkId` + wallet actif. Affiche :
 *   - Hero (logo, symbole, balance, prix USD).
 *   - Actions Envoyer / Recevoir / Acheter / Échanger.
 *   - Courbe d'évolution (CoinGecko, D6-d·A) avec 5 timeframes (D6-e·A).
 *   - Détails (réseau, contrat, décimales, type).
 *
 * **D6-f·A** — Acheter et Échanger sont visibles mais désactivés.
 */
export function AssetDetailRoute() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { networkId, assetId } = useParams<{
    networkId: string;
    assetId: string;
  }>();
  const {
    detail,
    loading: detailLoading,
    notFound,
  } = useAssetDetail(networkId, assetId);

  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [receiveOpen, setReceiveOpen] = useState(false);

  const priceQuery = useAssetPrice(assetId, timeframe);
  const copy = useClipboard();

  // ── Not found ──────────────────────────────────────────
  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> {t.assetDetail.back}
        </Link>
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm font-semibold">{t.assetDetail.notFound}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.assetDetail.notFoundDesc}
          </p>
        </div>
      </div>
    );
  }

  if (detailLoading || !detail) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      </div>
    );
  }

  // ── Balance formatée ───────────────────────────────────
  const balanceStr = (() => {
    if (detail.balance === null) return "0";
    if (detail.family === "sango") return formatSango(detail.balance);
    if (detail.family === "bitcoin") return formatBitcoin(detail.balance);
    if (detail.isNative) return formatTokenAmount(detail.balance, 18);
    return formatTokenAmount(detail.balance, detail.decimals);
  })();

  // ── Prix USD ───────────────────────────────────────────
  const currentPrice = priceQuery.data?.current ?? null;
  const change24h = priceQuery.data?.change24hPct ?? null;
  const priceUnavailable = !priceQuery.isLoading && !priceQuery.data;

  const balanceFiat =
    currentPrice !== null && detail.balance !== null
      ? (() => {
          // Conversion base units → float pour le calcul fiat.
          const base = 10n ** BigInt(detail.decimals);
          const whole = Number(detail.balance / base);
          const frac = Number(detail.balance % base) / Number(base);
          return (whole + frac) * currentPrice;
        })()
      : null;

  const changePositive = (change24h ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t.assetDetail.back}
      </Link>

      {/* ── Hero ──────────────────────────────────────── */}
      <header className="mt-6 flex items-center gap-4">
        <AssetLogo assetId={detail.assetId} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{detail.symbol}</p>
          <p className="text-xs text-muted-foreground">{detail.name}</p>
        </div>
      </header>

      <div className="mt-6">
        <p className="text-3xl font-semibold tracking-tight">
          {balanceStr}{" "}
          <span className="text-base font-normal text-muted-foreground">
            {detail.symbol}
          </span>
        </p>

        {balanceFiat !== null && (
          <p className="mt-1 text-sm text-muted-foreground">
            ≈{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(balanceFiat)}
          </p>
        )}

        {currentPrice !== null && (
          <div className="mt-3 flex items-baseline gap-2 text-xs">
            <span className="text-muted-foreground">
              {t.assetDetail.chart.priceNow} :
            </span>
            <span className="font-medium">
              ${currentPrice.toLocaleString("en-US", {
                maximumFractionDigits: 6,
              })}
            </span>
            {change24h !== null && (
              <span
                className={
                  changePositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                {changePositive ? "+" : ""}
                {change24h.toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Actions ──────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-4 gap-2">
        <ActionButton
          icon={<ArrowUpFromLine className="size-4" />}
          label={t.assetDetail.actions.send}
          onClick={() => navigate("/send")}
          testId="asset-action-send"
        />
        <ActionButton
          icon={<ArrowDownToLine className="size-4" />}
          label={t.assetDetail.actions.receive}
          onClick={() => setReceiveOpen(true)}
          testId="asset-action-receive"
        />
        <ActionButton
          icon={<ShoppingCart className="size-4" />}
          label={t.assetDetail.actions.buy}
          disabled
          title={t.assetDetail.actions.comingSoon}
          testId="asset-action-buy"
        />
        <ActionButton
          icon={<Repeat className="size-4" />}
          label={t.assetDetail.actions.swap}
          disabled
          title={t.assetDetail.actions.comingSoon}
          testId="asset-action-swap"
        />
      </div>

      {/* ── Chart ────────────────────────────────────── */}
      <div className="mt-6">
        <AssetChart
          data={priceQuery.data ?? null}
          loading={priceQuery.isLoading}
          error={priceQuery.isError}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          unavailable={priceUnavailable}
        />
      </div>

      {/* ── Details ──────────────────────────────────── */}
      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">
          {t.assetDetail.details.title}
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <DetailRow label={t.assetDetail.details.network}>
            {detail.networkName}
          </DetailRow>
          <DetailRow label={t.assetDetail.details.type}>
            {detail.isNative
              ? t.assetDetail.details.typeNative
              : t.assetDetail.details.typeToken}
          </DetailRow>
          {detail.contract && (
            <DetailRow label={t.assetDetail.details.contract}>
              <button
                type="button"
                onClick={() =>
                  copy(
                    detail.contract!,
                    t.assetDetail.receive.copied,
                  )
                }
                className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground transition-colors hover:text-primary"
              >
                {truncateMiddle(detail.contract, 10, 6)}
                <Copy className="size-3 text-muted-foreground" />
              </button>
            </DetailRow>
          )}
          <DetailRow label={t.assetDetail.details.decimals}>
            {detail.decimals}
          </DetailRow>
        </dl>
      </section>

      {/* ── Receive modal ────────────────────────────── */}
      <ReceiveAssetModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        address={detail.address}
        symbol={detail.symbol}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

interface ActionButtonProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly title?: string;
  readonly testId?: string;
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
  testId,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex flex-col items-center gap-1.5 rounded-xl border bg-card py-3 text-[11px] font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}

function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
