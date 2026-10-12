import type { ChainFamily } from "@sango/wallet-chains";

import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Sélecteur de **famille de chaîne** — Phase 5.4.
 *
 * Remplace le bloc mono-famille de la sidebar. Trois pills :
 *
 *     [SANGO] [EVM] [Bitcoin]
 *
 * Clic sur une pill → `setNetworkId(defaultNetworkForFamily)` :
 *   - SANGO   → "sango-devnet"
 *   - EVM     → "ethereum-mainnet"
 *   - Bitcoin → "bitcoin-mainnet"
 *
 * La bascule est **immédiate** (D5.4-c·A). Le sous-sélecteur de réseau
 * (`EvmNetworkSelector`, `BitcoinNetworkSelector`, `NetworkSelector`)
 * s'affiche automatiquement selon la famille active — il est rendu
 * par `AppShell` au-dessous.
 *
 * **D5.4-d·A** — wallet V1 (`format === "sango-legacy"`) : les pills
 * EVM et Bitcoin sont **désactivées** avec un tooltip explicite. La
 * règle est appliquée côté **UI** (bouton `disabled`) *et* côté
 * **store** (`setNetworkId` refuse `format !== "bip39"` — voir
 * `wallet-store.ts`). L'UI reflète la contrainte, elle ne la remplace
 * pas.
 *
 * **Périmètre** — `ChainFamily` (wallet-chains) inclut déjà `solana`
 * (préparation future) mais aucune infra Solana n'existe encore. On
 * définit un sous-type **`SupportedFamily`** pour 5.4 et on n'expose
 * que les 3 familles effectivement supportées. Le jour où Solana
 * arrive (Phase 6+), il suffit d'étendre ce sous-type + ajouter
 * les clés i18n + un réseau par défaut.
 */

type SupportedFamily = "sango" | "evm" | "bitcoin";

const SUPPORTED_FAMILIES: readonly SupportedFamily[] = [
  "sango",
  "evm",
  "bitcoin",
];

const DEFAULT_NETWORK_BY_FAMILY: Record<SupportedFamily, string> = {
  sango: "sango-devnet",
  evm: "ethereum-mainnet",
  bitcoin: "bitcoin-mainnet",
};

function isSupported(family: ChainFamily): family is SupportedFamily {
  return (SUPPORTED_FAMILIES as readonly string[]).includes(family);
}

export function FamilySelector() {
  const t = useTranslation();
  const family = useWalletStore((s) => s.family);
  const format = useWalletStore((s) => s.format);
  const setNetworkId = useWalletStore((s) => s.setNetworkId);

  const isV1 = format === "sango-legacy";

  function onSelect(target: SupportedFamily) {
    if (target === family) return;
    // V1 : refus côté UI (le store refuserait de toute façon).
    if (isV1 && target !== "sango") return;
    setNetworkId(DEFAULT_NETWORK_BY_FAMILY[target]);
  }

  // Filet de sécurité : si le store expose une famille non supportée
  // (état corrompu, futur ajout sans mise à jour ici), on ne crash pas.
  const activeIsSupported = isSupported(family);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {t.chains.title}
      </div>

      <div
        role="tablist"
        aria-label={t.chains.title}
        className="mt-2 grid grid-cols-3 gap-1"
      >
        {SUPPORTED_FAMILIES.map((f) => {
          const isActive = activeIsSupported && family === f;
          const isDisabled = isV1 && f !== "sango";
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`family-pill-${f}`}
              disabled={isDisabled && !isActive}
              title={isDisabled ? t.chains.disabledTooltip : undefined}
              onClick={() => onSelect(f)}
              className={[
                "rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : isDisabled
                    ? "cursor-not-allowed border-border text-muted-foreground/40"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              ].join(" ")}
            >
              {t.chains[f]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
