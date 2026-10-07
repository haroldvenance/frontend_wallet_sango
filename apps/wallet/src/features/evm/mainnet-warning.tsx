import {
  bitcoinNetworkById,
  evmNetworkById,
} from "@sango/wallet-chains";
import { AlertTriangle } from "lucide-react";

/**
 * Bandeau d'avertissement "fonds réels" — E2.3.a.3 / E2.1.b.7.c.
 *
 * Affiche un bandeau ambre si le `networkId` correspond à un réseau
 * **mainnet** d'une famille supportée. Rendu `null` sinon :
 *   - testnet (`isTestnet === true`)          → null
 *   - `networkId` inconnu du registre         → null
 *   - réseau SANGO (`sango-devnet`)           → null
 *
 * **D-E2.1-24** — le composant couvre désormais EVM **et** Bitcoin.
 * Avant, il utilisait `evmNetworkById()` uniquement, ce qui laissait
 * `bitcoin-mainnet` sans avertissement. Correction : résolution par
 * famille (`evmNetworkById` puis `bitcoinNetworkById`).
 *
 * **Source de vérité** : `isTestnet` du `Network` (D-E1.7-4). Pas de
 * liste locale de réseaux.
 *
 * **Purement informatif** : pas de confirmation bloquante.
 *
 * Le nom du fichier reste `mainnet-warning.tsx` dans
 * `features/evm/` (compat E2.3.a.3), mais le composant est
 * maintenant multi-famille.
 */

interface MainnetWarningProps {
  readonly networkId: string;
  readonly className?: string;
}

export function MainnetWarning({
  networkId,
  className = "",
}: MainnetWarningProps) {
  const isMainnet = resolveIsMainnet(networkId);
  if (!isMainnet) return null;

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

/**
 * Résout "est-ce un mainnet connu ?". Retourne `false` si :
 *   - réseau inconnu (aucun registre ne matche)
 *   - réseau testnet
 *   - famille non supportée par le warning (SANGO)
 */
function resolveIsMainnet(networkId: string): boolean {
  const evm = evmNetworkById(networkId);
  if (evm) return !evm.isTestnet;

  const btc = bitcoinNetworkById(networkId);
  if (btc) return !btc.isTestnet;

  return false;
}
