import { evmNetworkById } from "@sango/wallet-chains";
import { Droplet, ExternalLink } from "lucide-react";

import { useWalletStore } from "@/stores/wallet-store";

/**
 * Bouton Faucet pour réseaux EVM testnet (E1.7.d.2).
 *
 * **Lien externe uniquement** : les faucets officiels (BNB Chain,
 * Sepolia) ont des captchas anti-bot — aucun appel HTTP in-app n'est
 * possible. L'utilisateur ouvre le faucet dans un nouvel onglet, colle
 * son adresse, et reçoit les tokens.
 *
 * Affiché uniquement si :
 *   - `network.isTestnet === true` (D-E1.7-4), ET
 *   - un faucet connu est configuré pour ce `networkId`.
 *
 * **Périmètre E1.7.d.2** : Sepolia + BSC Testnet. Les autres testnets
 * EVM n'existent pas dans `ALL_EVM_NETWORKS` pour l'instant.
 *
 * La map `FAUCET_URLS` vit dans l'UI, pas dans `Network` : c'est une
 * décision produit (quelle URL recommander), pas une propriété
 * intrinsèque du réseau. Si on supporte 5 testnets, on l'extraira
 * dans un module dédié.
 */

const FAUCET_URLS: Readonly<Record<string, string>> = {
  // Sepolia — Alchemy Faucet (login requis, le plus stable).
  "ethereum-sepolia": "https://sepoliafaucet.com/",
  // BSC Testnet — Faucet officiel BNB Chain (support tBNB + USDT de test).
  "bsc-testnet": "https://testnet.bnbchain.org/faucet-smart",
};

interface EvmFaucetButtonProps {
  readonly variant?: "solid" | "ghost";
  readonly className?: string;
}

export function EvmFaucetButton({
  variant = "ghost",
  className = "",
}: EvmFaucetButtonProps) {
  const networkId = useWalletStore((s) => s.networkId);
  const network = evmNetworkById(networkId);

  // Uniquement sur testnet EVM connu.
  if (!network?.isTestnet) return null;
  const url = FAUCET_URLS[networkId];
  if (!url) return null;

  const baseCls =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all active:scale-[0.98]";
  const variantCls =
    variant === "solid"
      ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-500/90"
      : "border bg-background hover:bg-accent";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      title="Ouvre le faucet officiel dans un nouvel onglet"
      className={`${baseCls} ${variantCls} ${className}`}
    >
      <Droplet className="size-4" />
      Faucet
      <ExternalLink className="size-3 opacity-70" />
    </a>
  );
}
