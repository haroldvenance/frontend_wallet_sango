import { BitcoinComingSoon } from "@/components/branding/bitcoin-coming-soon";
import { useWalletStore } from "@/stores/wallet-store";

import { HistoryEvmRoute } from "./history-evm";
import { SangoHistoryRoute } from "./history-sango";

/**
 * Dispatcher `/history` — UX-2.b + E2.1.b.6.1.
 *
 * **D-E2.1-18** — dispatch sur `family`, pas `format`. Voir la note
 * dans `send.tsx` : `format === "bip39"` couvre EVM + Bitcoin.
 *
 *   family === "sango"   → <SangoHistoryRoute />
 *   family === "evm"     → <HistoryEvmRoute />
 *   family === "bitcoin" → <BitcoinComingSoon /> (E2.1.b.6.2)
 */
export function HistoryRoute() {
  const family = useWalletStore((s) => s.family);
  if (family === "bitcoin") return <BitcoinComingSoon feature="Historique" />;
  if (family === "evm") return <HistoryEvmRoute />;
  return <SangoHistoryRoute />;
}
