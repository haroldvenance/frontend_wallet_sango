import { evmNetworkById } from "@sango/wallet-chains";

import { useWalletStore } from "@/stores/wallet-store";
import { BalanceCardEvm } from "./balance-card-evm";

/**
 * Dashboard EVM (E1.5) — volontairement minimal.
 *
 * Affiche :
 *   - BalanceCardEvm : adresse + solde ETH natif + nonce.
 *
 * Le sous-titre reflète le réseau réel du wallet (choisi à la
 * création, D-UI-3).
 *
 * Pas encore (E1.5+) :
 *   - envoi ETH (patch 6.b)
 *   - historique EVM (patch 6.c, Etherscan V2)
 *   - tokens ERC-20
 */
export function EvmDashboard() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Wallet EVM · {networkName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
      </div>
      <div className="space-y-8">
        <BalanceCardEvm />
      </div>
    </div>
  );
}
