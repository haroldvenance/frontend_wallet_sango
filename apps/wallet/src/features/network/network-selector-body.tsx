import type { Network } from "@sango/wallet-chains";
import { Check, Globe } from "lucide-react";
import type { ReactNode } from "react";

import { NetworkLogo } from "@/components/branding/network-logo";

/**
 * **Phase 11.3** — Rendu partagé d'un sélecteur de réseau
 * (EVM + Bitcoin).
 *
 * Le wrapper fournit :
 *   - `heading` : libellé (« Réseau EVM » / « Réseau Bitcoin ») ;
 *   - `testIdPrefix` : "network" ou "bitcoin-network" — produit les
 *     `data-testid` `${prefix}-option-${id}` et `${prefix}-active-name` ;
 *   - `warning` : slot pour `MainnetWarning` (EVM uniquement).
 *
 * Aucune logique de store ici — pur rendu.
 */
interface NetworkSelectorBodyProps {
  readonly heading: string;
  readonly testIdPrefix: string;
  readonly networks: readonly Network[];
  readonly currentId: string;
  readonly currentName: string;
  readonly onSelect: (next: string) => void;
  readonly warning?: ReactNode;
}

export function NetworkSelectorBody(props: NetworkSelectorBodyProps) {
  const {
    heading,
    testIdPrefix,
    networks,
    currentId,
    currentName,
    onSelect,
    warning,
  } = props;

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Globe className="size-3" />
        {heading}
      </div>

      <div className="mt-2 space-y-1">
        {networks.map((n) => {
          const isActive = n.id === currentId;
          return (
            <button
              key={n.id}
              type="button"
              data-testid={`${testIdPrefix}-option-${n.id}`}
              onClick={() => onSelect(n.id)}
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
                <NetworkLogo networkId={n.id} size={18} />
                <span>{n.name}</span>
                {n.isTestnet && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
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
          data-testid={`${testIdPrefix}-active-name`}
        >
          {currentName}
        </span>
      </p>

      {warning}
    </div>
  );
}
