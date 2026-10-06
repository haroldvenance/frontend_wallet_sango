import { evmNetworkById } from "@sango/wallet-chains";
import { AlertTriangle } from "lucide-react";

/**
 * Bandeau d'avertissement "fonds réels" — E2.3.a.3 (D-E2.3-3).
 *
 * Affiche un bandeau ambre si le `networkId` correspond à un réseau
 * **mainnet** EVM connu. Rendu `null` sinon :
 *   - testnet (`isTestnet === true`)      → null
 *   - `networkId` inconnu du registre     → null
 *   - `networkId` SANGO                   → null
 *
 * **Purement informatif** : pas de confirmation bloquante, pas de
 * case à cocher, pas de modal. Le but est de rendre le réseau visible
 * au moment du choix (sélecteur) et au moment de l'action risquée
 * (envoi).
 *
 * **Source de vérité** : `evmNetworkById()` + `network.isTestnet`
 * (D-E1.7-4). Pas de liste locale `["ethereum-mainnet", "base", …]`
 * dans ce composant — la logique testnet/mainnet reste centralisée
 * dans le registre.
 */

interface MainnetWarningProps {
  readonly networkId: string;
  readonly className?: string;
}

export function MainnetWarning({
  networkId,
  className = "",
}: MainnetWarningProps) {
  const network = evmNetworkById(networkId);
  if (!network || network.isTestnet) return null;

  return (
    <div
      role="status"
      data-testid="mainnet-warning"
      className={[
        "flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-600 dark:text-amber-400",
        className,
      ]
        .join(" ")
        .trim()}
    >
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      <span>
        Ce réseau utilise des fonds réels. Vérifie le réseau avant
        d&apos;envoyer une transaction.
      </span>
    </div>
  );
}
