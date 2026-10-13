import { bitcoinNetworkById } from "@sango/wallet-chains";

import { useWalletStore } from "@/stores/wallet-store";

interface Props {
  hash: string;
  className?: string;
  /** **Phase 9.3** — override du réseau (défaut : réseau actif). */
  networkId?: string;
}

/**
 * Lien vers l'explorer Bitcoin du wallet actif — Patch A.2.
 *
 * Symétrique de `ExplorerLinkEvm`. Résout l'URL via
 * `bitcoinNetworkById(networkId).explorer` :
 *   - testnet → `https://mempool.space/testnet/tx/{hash}`
 *   - mainnet → `https://mempool.space/tx/{hash}`
 *
 * Compatible mainnet dès que le wallet y basculera (D-E2.1-22).
 */
export function ExplorerLinkBitcoin({
  hash,
  className,
  networkId: override,
}: Props) {
  const storeNetworkId = useWalletStore((s) => s.networkId);
  const networkId = override ?? storeNetworkId;
  const network = bitcoinNetworkById(networkId);
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
