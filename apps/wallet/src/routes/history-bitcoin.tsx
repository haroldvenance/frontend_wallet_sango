import { bitcoinNetworkById } from "@sango/wallet-chains";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { HistoryListBitcoin } from "@/features/bitcoin/history-list-bitcoin";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page historique Bitcoin — Phase 13-B.
 *
 * **Avant** : `/history` affichait `<BitcoinComingSoon />` alors que
 * `HistoryListBitcoin` existait et fonctionnait. Ce wrapper
 * l'active enfin.
 *
 * Miroir de `HistoryEvmRoute` (même structure header + back).
 */
export function HistoryBitcoinRoute() {
  const networkId = useWalletStore((s) => s.networkId);
  const networkName = bitcoinNetworkById(networkId)?.name ?? networkId;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour au tableau de bord
      </Link>

      <div className="mt-6 mb-6">
        <p className="text-sm text-muted-foreground">
          Wallet Bitcoin · {networkName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Historique
        </h1>
      </div>

      <HistoryListBitcoin />
    </div>
  );
}
