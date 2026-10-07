import { Droplet, ExternalLink } from "lucide-react";

import { useWalletStore } from "@/stores/wallet-store";

/**
 * Bouton Faucet Bitcoin testnet — E2.1.b.6.4.
 *
 * Lien externe uniquement (pas d'API in-app : les faucets ont des
 * captchas anti-bot, comme pour BSC / Sepolia). L'utilisateur ouvre
 * le faucet, colle son adresse `tb1q…`, reçoit des sats de test.
 *
 * **D-E2.1-21** — URL centralisée dans une constante (facile à
 * remplacer si le faucet disparaît). Affiché uniquement si le réseau
 * Bitcoin est un testnet.
 */

/**
 * Faucet public Bitcoin testnet (fiabilité variable selon les
 * périodes). Remplacer ici si nécessaire — un seul point de vérité.
 */
const BITCOIN_TESTNET_FAUCET_URL = "https://coinfaucet.eu/en/btc-testnet/";

interface BitcoinFaucetButtonProps {
  readonly variant?: "solid" | "ghost";
  readonly className?: string;
}

export function BitcoinFaucetButton({
  variant = "ghost",
  className = "",
}: BitcoinFaucetButtonProps) {
  const networkId = useWalletStore((s) => s.networkId);
  // Un seul réseau Bitcoin enregistré pour l'instant, mais on gate
  // explicitement — le mainnet ne doit pas afficher le faucet testnet.
  if (networkId !== "bitcoin-testnet") return null;

  const baseCls =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all active:scale-[0.98]";
  const variantCls =
    variant === "solid"
      ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-500/90"
      : "border bg-background hover:bg-accent";

  return (
    <a
      href={BITCOIN_TESTNET_FAUCET_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Ouvre le faucet Bitcoin testnet dans un nouvel onglet"
      className={`${baseCls} ${variantCls} ${className}`}
    >
      <Droplet className="size-4" />
      Get test BTC
      <ExternalLink className="size-3 opacity-70" />
    </a>
  );
}
