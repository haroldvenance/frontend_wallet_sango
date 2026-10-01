import { Wallet } from "@sango/wallet-core";
import { FiatLine } from "@/components/branding/fiat-line";
import { SangoCoinIcon } from "@/components/branding/sango-coin-icon";
import { AddressPill, HeroAssetCard } from "@/components/ui/hero-asset-card";
import { useAccount } from "@/hooks/use-account";
import { useChainInfo } from "@/hooks/use-chain-info";
import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, shortenAddress } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Carte de solde SANGO — wrapper de `HeroAssetCard`.
 *
 * Fournit les données SANGO (bech32m, solde, nonce/pubkey) et délègue
 * toute la présentation au composant universel.
 */
export function BalanceCard() {
  const t = useTranslation();
  const { wallet } = useWalletStore();
  const { data: account, isLoading } = useAccount();
  const { data: chainInfo } = useChainInfo();
  const copy = useClipboard();

  const sangoWallet = wallet instanceof Wallet ? wallet : null;
  const bech32 = sangoWallet?.identity.addressBech32 ?? "—";
  const hex = sangoWallet?.identity.addressHex ?? "—";
  const balanceDisplay = account
    ? formatSango(account.balance)
    : isLoading
      ? "…"
      : "0.0000000";

  const networkLabel =
    chainInfo?.chainId === sangoWallet?.identity.network
      ? sangoWallet?.identity.network ?? "unknown"
      : sangoWallet?.identity.network ?? "unknown";

  return (
    <HeroAssetCard
      icon={<SangoCoinIcon size={44} />}
      title={t.balance.totalBalance}
      subtitle={t.assets.sangoName}
      tag={networkLabel}
      balance={balanceDisplay}
      symbol="SANGO"
      fiatLine={account ? <FiatLine baseUnits={account.balance} /> : undefined}
      addressPill={
        <AddressPill
          display={shortenAddress(bech32, 10)}
          copyValue={hex}
          onCopy={copy}
          copiedMessage={t.balance.addressCopied}
          accent="primary"
        />
      }
      footer={
        account ? (
          <>
            {t.balance.nonce} : {account.nonce} ·{" "}
            {account.publicKey
              ? t.balance.keyRegistered
              : t.balance.keyNotRegistered}
          </>
        ) : undefined
      }
      accent="primary"
    />
  );
}
