import {
  ALL_BITCOIN_NETWORKS,
  bitcoinNetworkById,
} from "@sango/wallet-chains";
import { Check, Globe } from "lucide-react";
import { toast } from "sonner";

import { useWalletStore } from "@/stores/wallet-store";

/**
 * Sélecteur de réseau Bitcoin — E2.1.b.7.b.
 *
 * **Deux modes** (symétriques d'`EvmNetworkSelector`) :
 *
 * - **Uncontrolled** (défaut) — utilisé dans la sidebar. Lit
 *   `wallet-store.networkId`, écrit via `setNetworkId`, notifie par
 *   toast. Ne s'affiche que pour `family === "bitcoin"`.
 *
 * - **Controlled** — réservé aux formulaires éventuels. `value` est
 *   fourni ; le parent garde l'état local. Aucune écriture dans le
 *   store, aucun toast.
 *
 * Le simple fait que `value !== undefined` bascule entièrement en
 * controlled (D-E2.3-2, appliqué à Bitcoin).
 *
 * **Garde-fou cross-family** : `wallet-store.setNetworkId` refuse
 * désormais tout `networkId` dont la famille diffère du réseau
 * courant (D-E2.1-23). Un composant Bitcoin ne peut donc pas
 * accidentellement switcher vers un réseau EVM.
 */
interface BitcoinNetworkSelectorProps {
  readonly value?: string;
  readonly onChange?: (networkId: string) => void;
}

export function BitcoinNetworkSelector(
  props: BitcoinNetworkSelectorProps = {},
) {
  const { value, onChange } = props;
  const isControlled = value !== undefined;

  const storeFamily = useWalletStore((s) => s.family);
  const storeNetworkId = useWalletStore((s) => s.networkId);
  const storeSetNetworkId = useWalletStore((s) => s.setNetworkId);

  if (!isControlled && storeFamily !== "bitcoin") return null;

  const currentId = isControlled ? value : storeNetworkId;
  const current = bitcoinNetworkById(currentId);
  const currentName = current?.name ?? currentId;

  function handleChange(next: string) {
    if (next === currentId) return;

    if (isControlled) {
      onChange?.(next);
      return;
    }

    storeSetNetworkId(next);
    const target = bitcoinNetworkById(next);
    toast.success(`Réseau changé : ${target?.name ?? next}`);
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Globe className="size-3" />
        Réseau Bitcoin
      </div>

      <div className="mt-2 space-y-1">
        {ALL_BITCOIN_NETWORKS.map((n) => {
          const isActive = n.id === currentId;
          return (
            <button
              key={n.id}
              type="button"
              data-testid={`bitcoin-network-option-${n.id}`}
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
        Actif :{" "}
        <span
          className="font-medium"
          data-testid="bitcoin-network-active-name"
        >
          {currentName}
        </span>
      </p>
    </div>
  );
}
