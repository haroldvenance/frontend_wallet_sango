import { Droplet } from "lucide-react";

import { useFaucet, useFaucetHealth } from "@/hooks/use-faucet";
import { useTranslation } from "@/i18n/use-translation";

interface FaucetButtonProps {
  /** Variante visuelle : `solid` (bouton principal) ou `ghost` (dans carte). */
  variant?: "solid" | "ghost";
  className?: string;
}

/**
 * Bouton « Get testnet SANGO ».
 *
 * Désactivé si :
 *  - le faucet est down (`/health` ne répond pas) ;
 *  - une requête est en cours.
 */
export function FaucetButton({
  variant = "solid",
  className = "",
}: FaucetButtonProps) {
  const t = useTranslation();
  const { data: health, isLoading: healthLoading } = useFaucetHealth();
  const faucet = useFaucet();

  const faucetDown = !healthLoading && !health;
  const busy = faucet.isPending;

  const baseCls =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const variantCls =
    variant === "solid"
      ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-500/90"
      : "border bg-background hover:bg-accent";

  return (
    <button
      type="button"
      onClick={() => faucet.mutate()}
      disabled={busy || faucetDown}
      title={faucetDown ? t.faucet.unavailable : undefined}
      className={`${baseCls} ${variantCls} ${className}`}
    >
      <Droplet className="size-4" />
      {busy ? t.faucet.requesting : t.faucet.button}
    </button>
  );
}
