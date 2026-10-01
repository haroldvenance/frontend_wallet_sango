import { SangoCoinIcon } from "@/components/branding/sango-coin-icon";
import { AssetSection, type AssetItem } from "@/components/ui/asset-section";
import { useAccount } from "@/hooks/use-account";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango } from "@/lib/format";

/**
 * Liste d'assets SANGO — wrapper de `AssetSection`.
 *
 * UX-1 : un seul asset (SANGO natif). Prêt pour D8.
 */
export function AssetList() {
  const t = useTranslation();
  const { data: account, isLoading } = useAccount();

  const balance = account
    ? formatSango(account.balance)
    : isLoading
      ? "…"
      : "0.0000000";

  const items: AssetItem[] = [
    {
      id: "sango",
      icon: <SangoCoinIcon size={40} />,
      symbol: "SANGO",
      name: t.assets.sangoName,
      balance,
    },
  ];

  return (
    <AssetSection
      title={t.assets.title}
      subtitle={t.assets.subtitle}
      countLabel={`1 ${t.assets.asset}`}
      items={items}
      loading={isLoading}
      footer={
        <>
          {t.assets.onChainVia} <code>sango_getAccount</code>
        </>
      }
    />
  );
}
