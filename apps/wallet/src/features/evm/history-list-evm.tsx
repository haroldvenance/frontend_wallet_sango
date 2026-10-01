import { Bip39Wallet } from "@sango/wallet-core";
import type { HistoryItem } from "@sango/wallet-chains";
import { ArrowDownLeft, ArrowUpRight, Clock, RefreshCw } from "lucide-react";
import { useMemo } from "react";

import { ExplorerLinkEvm } from "@/features/evm/explorer-link-evm";
import { useEvmHistory } from "@/hooks/use-evm-history";
import { formatEthShort } from "@/lib/eth";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Historique EVM — volontairement minimal (E1.5).
 *
 * Affiche les dernières transactions touchant l'adresse du wallet
 * (envoyées + reçues, D-INDEXER-4). La direction est calculée en
 * comparant `from`/`to` avec l'adresse du wallet.
 *
 * Pas de pagination en E1.5 — 20 items max.
 * Pas de filtre.
 * Pas de sous-détail (gas, fees) — pourra venir en 6.d+.
 */
/**
 * Etherscan free tier : Ethereum mainnet + Sepolia uniquement.
 * Les L2 (Base, Arbitrum) nécessitent un plan payant.
 * On affiche un message court au lieu de l'erreur brute.
 */
function friendlyError(msg: string): string {
  if (msg.includes("Free API access is not supported")) {
    return "Historique non disponible sur ce réseau avec une clé Etherscan gratuite (L2 en plan payant).";
  }
  if (msg.includes("Invalid API Key")) {
    return "Clé Etherscan invalide. Vérifie VITE_ETHERSCAN_API_KEY.";
  }
  if (msg.includes("rate limit") || msg.includes("Max rate limit reached")) {
    return "Limite de requêtes Etherscan atteinte. Réessaye dans quelques secondes.";
  }
  return msg;
}

export function HistoryListEvm() {
  const wallet = useWalletStore((s) => s.wallet);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useEvmHistory(20);

  const myAddress = useMemo(() => {
    if (wallet instanceof Bip39Wallet) {
      return wallet.defaultAddress.toLowerCase();
    }
    return "";
  }, [wallet]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Activité récente</h2>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`size-3 ${isFetching ? "animate-spin" : ""}`} />
          Rafraîchir
        </button>
      </div>

      {isLoading && (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs text-amber-600 dark:text-amber-400">
          {friendlyError(error.message)}
        </div>
      )}

      {!isLoading && !isError && (!data || data.items.length === 0) && (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune transaction pour ce compte.
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {data.items.map((item) => (
            <HistoryRow key={item.txHash} item={item} myAddress={myAddress} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Ligne ───────────────────────────────────────────────────

interface RowProps {
  readonly item: HistoryItem;
  readonly myAddress: string;
}

function HistoryRow({ item, myAddress }: RowProps) {
  const isSent = item.from.toLowerCase() === myAddress;
  const isReceived = item.to.toLowerCase() === myAddress;
  const isPending = item.status === "pending";
  const isFailed = item.status === "failed";

  const counterparty = isSent ? item.to : item.from;
  const directionLabel = isSent
    ? "Envoyée"
    : isReceived
      ? "Reçue"
      : "Interne";

  const iconCls = isFailed
    ? "bg-destructive/10 text-destructive"
    : isPending
      ? "bg-amber-500/10 text-amber-500"
      : isSent
        ? "bg-indigo-500/10 text-indigo-500"
        : "bg-emerald-500/10 text-emerald-500";

  const date = item.timestamp
    ? new Date(item.timestamp * 1000).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconCls}`}
      >
        {isPending ? (
          <Clock className="size-4" />
        ) : isSent ? (
          <ArrowUpRight className="size-4" />
        ) : (
          <ArrowDownLeft className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{directionLabel}</span>
          {isPending && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
              en attente
            </span>
          )}
          {isFailed && (
            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              échouée
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono">
            {counterparty.slice(0, 8)}…{counterparty.slice(-6)}
          </span>
          <span>·</span>
          <span>{date}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-medium">
          {isSent ? "-" : "+"}
          {formatEthShort(item.amount)}{" "}
          <span className="text-xs font-normal text-muted-foreground">ETH</span>
        </div>
        <div className="mt-0.5">
          <ExplorerLinkEvm
            hash={item.txHash}
            className="text-[10px] text-muted-foreground hover:text-primary"
          />
        </div>
      </div>
    </div>
  );
}
