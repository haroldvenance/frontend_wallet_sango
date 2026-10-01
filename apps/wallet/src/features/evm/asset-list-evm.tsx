import { evmNetworkById } from "@sango/wallet-chains";
import { AssetSection, type AssetItem } from "@/components/ui/asset-section";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { formatEthShort } from "@/lib/eth";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Liste d'assets EVM — wrapper de `AssetSection`.
 *
 * UX-1 : un seul asset (ETH natif). Le badge réseau est affiché car
 * ETH existe sur plusieurs chaînes — préfigure D8.
 */
export function AssetListEvm() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;
  const { data: account, isLoading } = useEvmAccount();

  const balance = account
    ? formatEthShort(account.balance)
    : isLoading
      ? "…"
      : "0";

  const items: AssetItem[] = [
    {
      id: "eth",
      icon: (
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-semibold text-indigo-500">
          Ξ
        </div>
      ),
      symbol: "ETH",
      name: `Ethereum · ${networkName}`,
      balance,
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
      countLabel="1 actif"
      items={items}
      loading={isLoading}
      footer={
        <>
          Via <code>eth_getBalance</code>
        </>
      }
    />
  );
}
