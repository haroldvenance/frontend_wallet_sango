import { ALL_EVM_NETWORKS, evmNetworkById } from "@sango/wallet-chains";
import { Check, Globe } from "lucide-react";
import { toast } from "sonner";

import { useWalletStore } from "@/stores/wallet-store";

/**
 * Sélecteur de réseau EVM.
 *
 * Visible uniquement pour un wallet BIP-39. Le changement est
 * **persisté** dans `wallet-store` (D-E2.3-1) — il survit au reload
 * et au prochain unlock (la préférence de session gagne sur le
 * `networkId` du keyring tant qu'elle pointe vers un réseau EVM
 * connu du registre).
 *
 * **E2.3.a.2** ajoutera un sélecteur équivalent au create/import.
 * Aujourd'hui le défaut de création reste `ethereum-sepolia`
 * (D-UI-3).
 */
export function EvmNetworkSelector() {
  const format = useWalletStore((s) => s.format);
  const networkId = useWalletStore((s) => s.networkId);
  const setNetworkId = useWalletStore((s) => s.setNetworkId);

  // Le composant ne s'affiche que pour un wallet BIP-39.
  if (format !== "bip39") return null;

  const active = evmNetworkById(networkId);
  const activeName = active?.name ?? networkId;

  function onChange(next: string) {
    if (next === networkId) return;
    setNetworkId(next);
    const target = evmNetworkById(next);
    toast.success(`Réseau changé : ${target?.name ?? next}`);
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Globe className="size-3" />
        Réseau EVM
      </div>

      <div className="mt-2 space-y-1">
        {ALL_EVM_NETWORKS.map((n) => {
          const isActive = n.id === networkId;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onChange(n.id)}
              disabled={isActive}
              className={[
                "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                isActive
                  ? "border-indigo-500/40 bg-indigo-500/5 font-medium text-indigo-600 dark:text-indigo-400"
                  : "border-transparent hover:bg-accent",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                {isActive && <Check className="size-3.5" />}
                {!isActive && <span className="w-3.5" />}
                <span>{n.name}</span>
                {n.isTestnet && (
                  <span className="text-[10px] text-muted-foreground">
                    (testnet)
                  </span>
                )}
              </span>
              {!isActive && (
                <span className="text-[10px] text-muted-foreground">
                  changer
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Actif : <span className="font-medium">{activeName}</span>
      </p>
    </div>
  );
}
