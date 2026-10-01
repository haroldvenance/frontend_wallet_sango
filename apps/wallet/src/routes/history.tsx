import { useWalletStore } from "@/stores/wallet-store";

import { HistoryEvmRoute } from "./history-evm";
import { SangoHistoryRoute } from "./history-sango";

/**
 * Dispatcher `/history` — UX-2.b.
 *
 * Route canonique unique pour l'historique. Dispatch sur
 * `wallet.format` (pas sur l'URL, pas sur `networkId`) :
 *
 *   format === "sango-legacy" → <SangoHistoryRoute />
 *   format === "bip39"        → <HistoryEvmRoute />
 *
 * La route `/history-evm` reste publique comme alias, mais redirige
 * ici (via `<Navigate replace />` dans App.tsx).
 */
export function HistoryRoute() {
  const format = useWalletStore((s) => s.format);
  if (format === "bip39") return <HistoryEvmRoute />;
  return <SangoHistoryRoute />;
}
