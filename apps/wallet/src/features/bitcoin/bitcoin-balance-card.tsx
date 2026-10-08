import { bitcoinNetworkById } from "@sango/wallet-chains";

import { NativeAssetIcon } from "@/components/branding/native-asset-icon";
import { AddressPill, HeroAssetCard } from "@/components/ui/hero-asset-card";
import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useBitcoinBalance } from "@/hooks/use-bitcoin-balance";
import { useClipboard } from "@/hooks/use-clipboard";
import { formatBitcoin } from "@/lib/bitcoin";
import { truncateMiddle } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Carte de solde Bitcoin — wrapper de `HeroAssetCard` (E2.1.b.6.2).
 *
 * Symétrique de `BalanceCardEvm`. Fournit :
 *   - icône native BTC
 *   - adresse P2WPKH (`tb1q…` / `bc1q…`)
 *   - balance en BTC (formatée depuis les satoshis)
 *   - nonce ABSENT (Bitcoin n'a pas de nonce — D-E2.1-9)
 */
export function BitcoinBalanceCard() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = bitcoinNetworkById(networkId);
  const networkName = network?.name ?? networkId;

  const { data: balance, isLoading } = useBitcoinBalance();
  const addressInfo = useBitcoinAddress();
  const copy = useClipboard();

  const address = addressInfo?.address ?? "—";
  const balanceDisplay = balance
    ? formatBitcoin(balance.amount)
    : isLoading
      ? "…"
      : "0";

  return (
    <HeroAssetCard
      icon={<NativeAssetIcon assetId="btc" size="md" />}
      title="Solde BTC"
      subtitle={`${networkName}${network?.isTestnet ? " · testnet" : ""}`}
      tag="BIP-39"
      balance={balanceDisplay}
      symbol="BTC"
      addressPill={
        <AddressPill
          // Phase 4.2 (D2·A) — convention 10…4 uniforme.
          display={truncateMiddle(address, 10, 4)}
          copyValue={address}
          onCopy={copy}
          copiedMessage="Adresse copiée"
          accent="indigo"
        />
      }
      accent="indigo"
    />
  );
}
