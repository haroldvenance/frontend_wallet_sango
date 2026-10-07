import { BitcoinComingSoon } from "@/components/branding/bitcoin-coming-soon";
import { useWalletStore } from "@/stores/wallet-store";

import { SangoSendRoute } from "./send-sango";
import { SendEvmRoute } from "./send-evm";

/**
 * Dispatcher `/send` — UX-2.a + E2.1.b.6.1.
 *
 * **D-E2.1-18** — dispatch sur `family` (dérivée de `networkId`),
 * pas sur `format`. `format === "bip39"` couvre EVM **et** Bitcoin :
 * ce n'est plus un proxy valide pour la famille.
 *
 *   family === "sango"   → <SangoSendRoute />
 *   family === "evm"     → <SendEvmRoute />
 *   family === "bitcoin" → <BitcoinComingSoon /> (E2.1.b.6.3)
 *
 * Les routes `/send-evm` et `/send-bitcoin` (à venir) resteront des
 * alias, mais le dispatch canonique est ici.
 */
export function SendRoute() {
  const family = useWalletStore((s) => s.family);
  if (family === "bitcoin") return <BitcoinComingSoon feature="Envoi" />;
  if (family === "evm") return <SendEvmRoute />;
  return <SangoSendRoute />;
}
