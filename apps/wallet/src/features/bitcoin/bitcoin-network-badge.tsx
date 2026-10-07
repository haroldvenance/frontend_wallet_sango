import { bitcoinNetworkById } from "@sango/wallet-chains";
import { Wifi, WifiOff } from "lucide-react";

import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useBitcoinBalance } from "@/hooks/use-bitcoin-balance";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Badge du réseau Bitcoin actif — E2.1.b.6.4.
 *
 * Symétrique de `EvmNetworkBadge`, mais sans généralisation : Bitcoin
 * a son propre modèle de disponibilité (`useBitcoinBalance`) et son
 * propre accès à l'adresse (`useBitcoinAddress`).
 *
 * Affichage :
 *   [●] Bitcoin Testnet
 *       tb1q…abcd           ← adresse tronquée (utile sur testnet)
 *
 * Pas de sélecteur Bitcoin en E2.1.b — un seul réseau enregistré
 * (`bitcoin-testnet`). Le sélecteur sera ajouté quand `bitcoin-mainnet`
 * sera livré.
 */
export function BitcoinNetworkBadge() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = bitcoinNetworkById(networkId);
  const networkName = network?.name ?? networkId;

  const { isError, isLoading } = useBitcoinBalance();
  const addressInfo = useBitcoinAddress();

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

  const truncated = addressInfo
    ? `${addressInfo.address.slice(0, 10)}…${addressInfo.address.slice(-6)}`
    : "—";

  return (
    <div className="mt-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <Wifi className="size-3 text-indigo-500" />
        <span className="text-xs font-medium">{networkName}</span>
      </div>
      <p className="mt-1 pl-5 font-mono text-[10px] text-muted-foreground">
        {truncated}
      </p>
    </div>
  );
}
