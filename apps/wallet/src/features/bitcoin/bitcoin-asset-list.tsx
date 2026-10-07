import { bitcoinNetworkById } from "@sango/wallet-chains";

import { NativeAssetIcon } from "@/components/branding/native-asset-icon";
import { AssetSection, type AssetItem } from "@/components/ui/asset-section";
import { useBitcoinBalance } from "@/hooks/use-bitcoin-balance";
import { formatBitcoin } from "@/lib/bitcoin";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Liste d'assets Bitcoin — E2.1.b.6.2.
 *
 * Bitcoin n'a qu'un seul asset natif (BTC). Pas de tokens (hors scope).
 * Structure identique à `AssetListEvm` mais avec un seul item.
 */
export function BitcoinAssetList() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = bitcoinNetworkById(networkId);
  const networkName = network?.name ?? networkId;

  const { data: balance, isLoading } = useBitcoinBalance();

  const balanceDisplay = balance
    ? formatBitcoin(balance.amount)
    : isLoading
      ? "…"
      : "0";

  const items: AssetItem[] = [
    {
      id: "btc",
      icon: <NativeAssetIcon assetId="btc" size="sm" />,
      symbol: "BTC",
      name: `Bitcoin · ${networkName}`,
      balance: balanceDisplay,
      badges: [
        <span
          key="net"
          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {networkName}
        </span>,
      ],
    },
  ];

  return (
    <AssetSection
      title="Cryptos"
      subtitle="Tes actifs sur ce wallet"
      countLabel={`${items.length} actif`}
      items={items}
      loading={isLoading && !balance}
      footer={
        <>
          Via <code>mempool.space /address/{"{addr}"}/utxo</code>
        </>
      }
    />
  );
}
