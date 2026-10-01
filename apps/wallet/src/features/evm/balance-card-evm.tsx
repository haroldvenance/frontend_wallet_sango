import { Bip39Wallet } from "@sango/wallet-core";
import { evmNetworkById } from "@sango/wallet-chains";
import { AddressPill, HeroAssetCard } from "@/components/ui/hero-asset-card";
import { useClipboard } from "@/hooks/use-clipboard";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { formatEthShort } from "@/lib/eth";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Carte de solde EVM — wrapper de `HeroAssetCard`.
 *
 * Fournit les données EVM (adresse 0x…, solde wei, nonce) et délègue
 * toute la présentation au composant universel.
 */
export function BalanceCardEvm() {
  const wallet = useWalletStore((s) => s.wallet);
  const networkId = useWalletStore((s) => s.networkId);
  const { data: account, isLoading } = useEvmAccount();
  const copy = useClipboard();

  const bip39Wallet = wallet instanceof Bip39Wallet ? wallet : null;
  const address = bip39Wallet?.defaultAddress ?? "—";
  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;
  const isTestnet = networkId === "ethereum-sepolia";

  const balanceDisplay = account
    ? formatEthShort(account.balance)
    : isLoading
      ? "…"
      : "0";

  return (
    <HeroAssetCard
      icon={
        <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-lg font-semibold text-indigo-500">
          Ξ
        </div>
      }
      title="Solde Ethereum"
      subtitle={`${networkName}${isTestnet ? " · testnet" : ""}`}
      tag="BIP-39"
      balance={balanceDisplay}
      symbol="ETH"
      addressPill={
        <AddressPill
          display={
            address.length > 14
              ? `${address.slice(0, 8)}…${address.slice(-6)}`
              : address
          }
          copyValue={address}
          onCopy={copy}
          copiedMessage="Adresse copiée"
          accent="indigo"
        />
      }
      footer={account ? <>Nonce : {account.nonce}</> : undefined}
      accent="indigo"
    />
  );
}
