import { UnifiedHistoryList } from "@/features/history/unified-history-list";
import { useHighlightTx } from "@/hooks/use-highlight-tx";

/**
 * Route `/history` — **Phase 13-C** : unifiée cross-chain.
 *
 * Historique : cette route dispatchait sur `family` (Sango/EVM/Bitcoin).
 * Depuis 13-C elle rend l'agrégat cross-chain par défaut. Les vues
 * spécialisées sont conservées sous :
 *   - `/history/sango`   → `SangoHistoryRoute`
 *   - `/history/evm`     → `HistoryEvmRoute`
 *   - `/history/bitcoin` → `HistoryBitcoinRoute`
 *
 * **Deep-link notifications (Phase 12-E)** : `useHighlightTx` reste
 * branché ici pour que `?tx=<hash>` scroll + highlight la row
 * correspondante (rendue par `AggregatedRow` avec `id="tx-<hash>"`).
 */
export function UnifiedHistoryRoute() {
  useHighlightTx();
  return <UnifiedHistoryList />;
}
