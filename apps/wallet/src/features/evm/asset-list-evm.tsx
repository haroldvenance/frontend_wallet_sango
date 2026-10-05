import { evmNetworkById } from "@sango/wallet-chains";

import { NativeAssetIcon } from "@/components/branding/native-asset-icon";
import { AssetSection, type AssetItem } from "@/components/ui/asset-section";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { useEvmTokens } from "@/hooks/use-evm-tokens";
import { formatNativeShort, formatStablecoinUsd, formatTokenAmount } from "@/lib/eth";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Liste d'assets EVM — natif (ETH, BNB) + tokens ERC-20 (E1.7.e).
 *
 * Ordre : natif d'abord (gas token), puis les tokens dans l'ordre du
 * registre (`EVM_TOKENS`). Le badge réseau n'est affiché que sur le
 * natif (les tokens sont implicitement sur ce réseau).
 *
 * Fiat : parité stablecoin `≈ $X.XX` pour USDC/USDT. ETH n'a pas de
 * fiat en E1.6 (nécessiterait une API externe, hors scope).
 */
export function AssetListEvm() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;
  const nativeAsset = network?.nativeAsset ?? "unknown";
  const nativeSymbol = nativeAsset.toUpperCase();

  const { data: account, isLoading: loadingNative } = useEvmAccount();
  const { data: tokens, isLoading: loadingTokens } = useEvmTokens();

  const isLoading = loadingNative || loadingTokens;

  const nativeBalance = account
    ? formatNativeShort(account.balance)
    : loadingNative
      ? "…"
      : "0";

  const nativeItem: AssetItem = {
    id: nativeAsset,
    icon: <NativeAssetIcon assetId={nativeAsset} size="sm" />,
    symbol: nativeSymbol,
    name: `${nativeSymbol} · ${networkName}`,
    balance: nativeBalance,
    badges: [
      <span
        key="net"
        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
      >
        {networkName}
      </span>,
    ],
  };

  const tokenItems: AssetItem[] = (tokens ?? []).map(({ token, balance }) => ({
    id: token.assetId,
    icon: (
      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        {token.metadata.symbol.slice(0, 4)}
      </div>
    ),
    symbol: token.metadata.symbol,
    name: token.metadata.name,
    balance:
      balance !== null
        ? formatTokenAmount(balance, token.metadata.decimals)
        : "—",
    fiat:
      balance !== null
        ? `≈ ${formatStablecoinUsd(balance, token.metadata.decimals)}`
        : undefined,
  }));

  const items: AssetItem[] = [nativeItem, ...tokenItems];
  const count = items.length;

  return (
    <AssetSection
      title="Cryptos"
      subtitle="Tes actifs sur ce wallet"
      countLabel={`${count} actif${count > 1 ? "s" : ""}`}
      items={items}
      loading={isLoading}
      footer={
        <>
          Via <code>eth_getBalance</code>
          {tokenItems.length > 0 && (
            <>
              {" · "}
              <code>eth_call balanceOf</code>
            </>
          )}
        </>
      }
    />
  );
}
