import { evmNetworkById } from "@sango/wallet-chains";

import { useWalletStore } from "@/stores/wallet-store";

interface Props {
  hash: string;
  className?: string;
}

/**
 * Lien vers l'explorer du réseau EVM du wallet actif.
 *
 * Utilise `evmNetworkById(networkId)` pour résoudre le baseUrl, puis
 * le template `txPath` (`/tx/{hash}`) défini dans la config.
 *
 * Rendu : lien inline ouvrant dans un nouvel onglet. `null` si le
 * réseau n'a pas d'explorer (aucun cas connu en E1.5).
 */
export function ExplorerLinkEvm({ hash, className }: Props) {
  const networkId = useWalletStore((s) => s.networkId);
  const network = evmNetworkById(networkId);
  if (!network?.explorer) return null;

  const url = `${network.explorer.baseUrl}${network.explorer.txPath.replace(
    "{hash}",
    hash,
  )}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={
        className ??
        "text-xs font-medium text-primary transition-colors hover:underline"
      }
    >
      Voir sur l&apos;explorer ↗
    </a>
  );
}
