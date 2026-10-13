import { X } from "lucide-react";
import { useEffect } from "react";

import { FamilySelector } from "@/components/settings/family-selector";
import { NetworkSelector } from "@/components/settings/network-selector";
import { BitcoinNetworkSelector } from "@/features/bitcoin/bitcoin-network-selector";
import { EvmNetworkSelector } from "@/features/evm/evm-network-selector";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Modal de changement de réseau — Phase 9.1 (D9-c·A, D9-i·A).
 *
 * Contenu :
 *   - `FamilySelector` (pills SANGO / EVM / Bitcoin) ;
 *   - sous-sélecteur contextuel selon la famille active.
 *
 * **D9-i·A** — un seul modal permet de basculer **de famille** ET de
 * réseau. `setNetworkId` (store) fait le reste (auth cross-family en
 * Phase 5.2, UI reflète les contraintes V1).
 */
export function NetworkPickerModal({ open, onClose }: Props) {
  const t = useTranslation();
  const family = useWalletStore((s) => s.family);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="network-picker-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-2xl border bg-card p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {t.dashboard.networkPicker.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <FamilySelector />

        <div className="max-h-[45vh] overflow-y-auto">
          {family === "sango" && <NetworkSelector />}
          {family === "evm" && <EvmNetworkSelector />}
          {family === "bitcoin" && <BitcoinNetworkSelector />}
        </div>

        <button
          type="button"
          data-testid="network-picker-done"
          onClick={onClose}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t.dashboard.networkPicker.done}
        </button>
      </div>
    </div>
  );
}
