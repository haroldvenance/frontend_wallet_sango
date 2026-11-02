import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { bitcoinNetworkById, evmNetworkById } from "@sango/wallet-chains";

import { NetworkLogo } from "@/components/branding/network-logo";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

import { NetworkPickerModal } from "./network-picker-modal";

/**
 * Carte du réseau actif.
 *
 * Fallback pour un `networkId` inconnu : libellé générique traduit
 * (« Réseau ») — on n'expose JAMAIS l'ID technique brut à
 * l'utilisateur.
 */
export function NetworkCard() {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const family = useWalletStore((s) => s.family);
  const networkId = useWalletStore((s) => s.networkId);

  const name = (() => {
    if (family === "bitcoin") {
      return bitcoinNetworkById(networkId)?.name ?? t.network.sangoNetwork;
    }
    if (family === "evm") {
      return evmNetworkById(networkId)?.name ?? t.network.sangoNetwork;
    }
    return "Sango";
  })();

  return (
    <>
      <button
        type="button"
        data-testid="network-card"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <NetworkLogo networkId={networkId} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t.dashboard.networkCard.title}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{name}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">
          {t.dashboard.networkCard.change}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <NetworkPickerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}