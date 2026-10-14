import { ArrowLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { bitcoinNetworkById, evmNetworkById } from "@sango/wallet-chains";

import { AssetLogo } from "@/components/branding/asset-logo";
import { NetworkLogo } from "@/components/branding/network-logo";
import {
  getDisplayAssetId,
  useAllWalletAssets,
  type WalletAsset,
} from "@/hooks/use-all-wallet-assets";
import { useTranslation } from "@/i18n/use-translation";
import { formatBitcoin } from "@/lib/bitcoin";
import { formatTokenAmount } from "@/lib/eth";
import { formatSango } from "@/lib/format";

/**
 * Picker d'actif pour `/send` — Phase 10 (D10-c·A, D10-d·A, D10-h·A).
 *
 * **Utilisé dans 2 cas** :
 *   1. L'utilisateur clique « Envoyer » depuis le dashboard → `/send`
 *      sans params → le picker s'affiche.
 *   2. L'utilisateur arrive avec des params invalides → même fallback.
 *
 * **Structure** : liste groupée par réseau (Ethereum, BNB, Bitcoin,
 * Sango…). Chaque groupe affiche son logo + nom, puis les actifs
 * supportés (avec solde). Clic → `/send?network={id}&asset={aid}`.
 *
 * **D10-d·A** — toutes les lignes affichent le solde, y compris 0,
 * pour que l'utilisateur voie ce qui est disponible.
 */
export function SendAssetPicker() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { assets, loading } = useAllWalletAssets();

  // Groupe par networkId, ordre préservé par la liste triée.
  const groups = useMemo(() => {
    const map = new Map<string, WalletAsset[]>();
    for (const a of assets) {
      const arr = map.get(a.networkId) ?? [];
      arr.push(a);
      map.set(a.networkId, arr);
    }
    return Array.from(map.entries());
  }, [assets]);

  function onSelect(a: WalletAsset) {
    const aid = getDisplayAssetId(a);
    navigate(`/send?network=${a.networkId}&asset=${aid}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t.send.shell.back}
      </Link>

      <header className="mt-6">
        <h1 className="text-xl font-semibold tracking-tight">
          {t.send.picker.title}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.send.picker.subtitle}
        </p>
      </header>

      {loading && groups.length === 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {t.send.picker.empty}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {groups.map(([networkId, networkAssets]) => {
          const networkName = resolveNetworkName(networkId);
          return (
            <section key={networkId}>
              <header className="mb-2 flex items-center gap-2 px-1">
                <NetworkLogo networkId={networkId} size={20} />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {networkName}
                </h2>
              </header>

              <div className="overflow-hidden rounded-2xl border bg-card">
                {networkAssets.map((a) => (
                  <button
                    key={`${a.networkId}:${getDisplayAssetId(a)}`}
                    type="button"
                    data-testid={`send-picker-${a.networkId}-${getDisplayAssetId(a)}`}
                    onClick={() => onSelect(a)}
                    className="flex w-full items-center gap-3 border-b p-3 text-left transition-colors last:border-b-0 hover:bg-accent/40"
                  >
                    <AssetLogo
                      assetId={getDisplayAssetId(a)}
                      fallbackSymbol={a.symbol}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {a.symbol}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {a.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm">
                        {formatBalance(a)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {a.symbol}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function resolveNetworkName(networkId: string): string {
  const evm = evmNetworkById(networkId);
  if (evm) return evm.name;
  const btc = bitcoinNetworkById(networkId);
  if (btc) return btc.name;
  if (networkId.startsWith("sango-")) return "Sango";
  return networkId;
}

function formatBalance(a: WalletAsset): string {
  if (a.balance === null) return "—";
  if (a.family === "sango") return formatSango(a.balance);
  if (a.family === "bitcoin") return formatBitcoin(a.balance);
  return formatTokenAmount(a.balance, a.decimals);
}
