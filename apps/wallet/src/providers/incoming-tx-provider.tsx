import { useEffect, type ReactNode } from "react";

import {
  useAggregatedHistory,
  type AggregatedTx,
} from "@/hooks/use-aggregated-history";
import { useTranslation } from "@/i18n/use-translation";
import { truncateMiddle } from "@/lib/format";
import { notify } from "@/lib/notify";
import { useIncomingNotificationStore } from "@/stores/incoming-notification-store";
import { useIncomingTxStore } from "@/stores/incoming-tx-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useWalletStore } from "@/stores/wallet-store";

import { showIncomingNotification } from "@/lib/web-notifications";

/**
 * **Phase 12-C** — Détecte les tx entrantes et notifie.
 *
 * **Cycle de vie** :
 *   - Auto-gate sur `status === "unlocked"`. Rien ne tourne quand
 *     verrouillé.
 *   - Réutilise `useAggregatedHistory(30)` (mêmes queries que le
 *     Dashboard → cache React Query partagé, zéro surcoût réseau).
 *   - Un seul `useEffect` qui traite **toutes** les tx entrantes en
 *     une passe, par `networkId`.
 *
 * **Bootstrap** : au premier chargement d'un `networkId`, marque
 * les tx reçues comme vues SANS notifier. Évite une rafale de
 * toasts au premier mount.
 *
 * **Dédup** : `seenKeys[networkId]` FIFO 50. `markSeen` toujours
 * appelé (même si le toggle est off) — évite de manquer des tx
 * pendant la fenêtre off.
 *
 * **Limite V1** : wallet actif + tx hash unique par chaîne. Le
 * multi-wallet viendra en Phase 12-D (clé `networkId:address:hash`).
 */
const WATCH_LIMIT = 30;

export function IncomingTxProvider({ children }: { children: ReactNode }) {
  const status = useWalletStore((s) => s.status);
  return (
    <>
      {status === "unlocked" && <IncomingTxWatcher />}
      {children}
    </>
  );
}

function IncomingTxWatcher() {
  const t = useTranslation();
  const { txs } = useAggregatedHistory(WATCH_LIMIT);
  const seenKeys = useIncomingTxStore((s) => s.seenKeys);
  const markSeen = useIncomingTxStore((s) => s.markSeen);
  const addNotifications = useIncomingNotificationStore((s) => s.add);

  useEffect(() => {
    if (txs.length === 0) return;

    // Groupe les tx entrantes par networkId.
    // `AggregatedTx` est readonly dans `txs` mais on construit un
    // array mutable local (TS infère readonly sinon).
    const incoming: AggregatedTx[] = txs.filter(
      (tx) => tx.direction === "in",
    );
    const byNetwork = new Map<string, AggregatedTx[]>();
    for (const tx of incoming) {
      const arr = byNetwork.get(tx.networkId);
      if (arr) arr.push(tx);
      else byNetwork.set(tx.networkId, [tx]);
    }

    for (const [networkId, incoming] of byNetwork) {
      const known = seenKeys[networkId];
      const isBootstrap = known === undefined;

      const newKeys = isBootstrap
        ? incoming.map((tx) => tx.txHash)
        : incoming
            .map((tx) => tx.txHash)
            .filter((h) => !known.includes(h));

      if (newKeys.length === 0) continue;

      // Marque toujours (idempotent), notifie conditionnellement.
      markSeen(networkId, newKeys);

      if (isBootstrap) continue;

      // Prépare les entrées affichables (badge, dropdown, notif
      // système) — exclut les tx déjà présentes au bootstrap car
      // on est déjà sorti du `if (isBootstrap) continue` ci-dessus.
      const newTxs = newKeys
        .map((hash) => incoming.find((x) => x.txHash === hash))
        .filter((tx): tx is NonNullable<typeof tx> => tx !== undefined);

      const badgeEntries = newTxs.map((tx) => ({
        key: `${tx.networkId}:${tx.txHash}`,
        source: tx.source,
        networkId: tx.networkId,
        txHash: tx.txHash,
        symbol: tx.symbol,
        amount: tx.amount,
        counterparty: tx.counterparty,
        status: tx.status,
        detectedAt: Date.now(),
        read: false,
      }));
      addNotifications(badgeEntries);

      // Notification système — seulement si toggle ON, permission
      // `granted`, onglet caché, et toggle `incomingNotificationsEnabled`
      // activé (même canal sémantique que le toast).
      const prefs = usePreferencesStore.getState();
      if (
        prefs.systemNotificationsEnabled &&
        prefs.incomingNotificationsEnabled
      ) {
        for (const tx of newTxs) {
          showIncomingNotification({
            title: `+${formatAmount(tx.amount)} ${tx.symbol}`,
            body: buildDescription(
              tx.counterparty,
              tx.status === "pending" ? t.incomingTx.pending : null,
            ),
            tag: `sango-${tx.networkId}-${tx.txHash}`,
            txHash: tx.txHash,
          });
        }
      }

      // Toast in-app.
      for (const tx of newTxs) {
        notify.incoming(
          t.incomingTx.title
            .replace("{amount}", formatAmount(tx.amount))
            .replace("{symbol}", tx.symbol),
          {
            description: buildDescription(
              tx.counterparty,
              tx.status === "pending" ? t.incomingTx.pending : null,
            ),
          },
        );
      }
    }
  }, [txs, seenKeys, markSeen, addNotifications, t]);

  return null;
}

// ── Helpers ─────────────────────────────────────────────────

function formatAmount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs < 1 ? 6 : abs < 100 ? 4 : 2;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

function buildDescription(
  counterparty: string | null,
  pendingLabel: string | null,
): string {
  const parts: string[] = [];
  if (counterparty) parts.push(`de ${truncateMiddle(counterparty, 6, 4)}`);
  if (pendingLabel) parts.push(pendingLabel);
  return parts.join(" · ");
}
