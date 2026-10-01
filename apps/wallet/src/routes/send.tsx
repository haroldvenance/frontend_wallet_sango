import { useWalletStore } from "@/stores/wallet-store";

import { SangoSendRoute } from "./send-sango";
import { SendEvmRoute } from "./send-evm";

/**
 * Dispatcher `/send` — UX-2.a.
 *
 * Route canonique unique pour l'envoi. Dispatch sur `wallet.format`
 * (pas sur l'URL, pas sur `networkId`) :
 *
 *   format === "sango-legacy" → <SangoSendRoute />
 *   format === "bip39"        → <SendEvmRoute />
 *
 * La route `/send-evm` reste publique comme alias, mais redirige ici
 * (via `<Navigate replace />` dans App.tsx).
 */
export function SendRoute() {
  const format = useWalletStore((s) => s.format);
  if (format === "bip39") return <SendEvmRoute />;
  return <SangoSendRoute />;
}
