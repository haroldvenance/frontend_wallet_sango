import { evmNetworkById } from "@sango/wallet-chains";
import { Wifi, WifiOff } from "lucide-react";

import { useEvmAccount } from "@/hooks/use-evm-account";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Badge du réseau EVM actif, affiché dans la sidebar.
 *
 * Symétrique du `NetworkBadge` SANGO mais volontairement minimal :
 *   - nom du réseau (issu de `evmNetworkById`)
 *   - indicateur online/offline basé sur l'état de `useEvmAccount`
 *
 * **Pas de chainInfo, pas de height, pas de version** — ces concepts
 * sont SANGO-spécifiques (D-SESS-6). Un badge EVM n'a pas à poller
 * `eth_blockNumber` en permanence.
 */
export function EvmNetworkBadge() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = evmNetworkById(networkId);
  const { isError, isLoading } = useEvmAccount();

  const networkName = network?.name ?? networkId;

  if (isLoading) {
    return (
      <div className="mt-3 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Connexion…
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex items-center gap-2">
          <WifiOff className="size-3 text-destructive" />
          <span className="text-xs font-medium text-destructive">
            Hors ligne
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <Wifi className="size-3 text-indigo-500" />
        <span className="text-xs font-medium">{networkName}</span>
      </div>
      <p className="mt-1 pl-5 text-[10px] text-muted-foreground">EVM</p>
    </div>
  );
}
