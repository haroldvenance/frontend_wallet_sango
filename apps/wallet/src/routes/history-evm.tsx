import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { evmNetworkById } from "@sango/wallet-chains";
import { HistoryListEvm } from "@/features/evm/history-list-evm";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page historique EVM (fullscreen).
 *
 * UX-1 : réutilise `HistoryListEvm` (déjà affiché sur le dashboard).
 * Cette route existe principalement pour que le nav item "Historique"
 * pointe quelque part de cohérent pour un wallet BIP-39.
 */
export function HistoryEvmRoute() {
  const networkId = useWalletStore((s) => s.networkId);
  const networkName = evmNetworkById(networkId)?.name ?? networkId;

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
          Wallet EVM · {networkName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Historique
        </h1>
      </div>

      <HistoryListEvm />
    </div>
  );
}
