import { ALL_EVM_NETWORKS, evmNetworkById } from "@sango/wallet-chains";
import { Check, Globe } from "lucide-react";
import { toast } from "sonner";

import { useWalletStore } from "@/stores/wallet-store";

/**
 * Sélecteur de réseau EVM.
 *
 * **Deux modes (D-E2.3-2)** :
 *
 * - **Uncontrolled** (par défaut) — utilisé dans Settings. Lit
 *   `wallet-store.networkId`, écrit via `setNetworkId`, notifie par
 *   toast. Le composant ne s'affiche que pour un wallet BIP-39.
 *
 * - **Controlled** — utilisé au create/import EVM. `value` est
 *   fourni ; le parent garde l'état local. Aucune écriture dans le
 *   store, aucun toast, et le garde-fou `format === "bip39"` ne
 *   s'applique pas (précisément parce qu'il n'y a pas encore de
 *   session).
 *
 * Le simple fait que `value !== undefined` bascule entièrement le
 * composant en controlled. On ne mélange jamais les deux modes
 * (`value ?? storeNetworkId` avec écriture au store serait un bug).
 *
 * `setNetworkId()` garde son garde-fou `format === "bip39"` : le mode
 * controlled contourne naturellement ce mécanisme puisqu'il n'écrit
 * pas dans le store.
 */

interface EvmNetworkSelectorProps {
  /**
   * Mode controlled : identifiant du réseau affiché comme actif.
   *
   * Si fourni, bascule entièrement le composant en controlled — pas
   * d'écriture dans `wallet-store`, pas de toast.
   */
  readonly value?: string;
  /** Mode controlled : notifié au changement de sélection. */
  readonly onChange?: (networkId: string) => void;
}

export function EvmNetworkSelector(props: EvmNetworkSelectorProps = {}) {
  const { value, onChange } = props;
  const isControlled = value !== undefined;

  const storeFormat = useWalletStore((s) => s.format);
  const storeNetworkId = useWalletStore((s) => s.networkId);
  const storeSetNetworkId = useWalletStore((s) => s.setNetworkId);

  // En uncontrolled, on ne s'affiche que pour un wallet BIP-39.
  // En controlled, on s'affiche toujours (le parent arbitre).
  if (!isControlled && storeFormat !== "bip39") return null;

  const currentId = isControlled ? value : storeNetworkId;
  const current = evmNetworkById(currentId);
  const currentName = current?.name ?? currentId;

  function handleChange(next: string) {
    if (next === currentId) return;

    if (isControlled) {
      onChange?.(next);
      return;
    }

    storeSetNetworkId(next);
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
          const isActive = n.id === currentId;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => handleChange(n.id)}
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
        Actif : <span className="font-medium">{currentName}</span>
      </p>
    </div>
  );
}
