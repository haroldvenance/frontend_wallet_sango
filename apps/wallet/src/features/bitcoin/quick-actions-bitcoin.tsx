import { useNavigate } from "react-router-dom";

import { ActionsRow } from "@/components/ui/actions-row";
import { BitcoinFaucetButton } from "./bitcoin-faucet-button";
import { SHOW_TESTNETS } from "@/lib/env-flags";

/**
 * Actions rapides Bitcoin — E2.1.b.6.3.
 *
 * Send → /send (dispatch vers SendBitcoinRoute).
 * Receive → copie l'adresse `tb1q…` (pas de modal dédié en 6.3,
 * même pattern que `QuickActionsEvm`).
 * Faucet → lien externe testnet (E2.1.b.6.4).
 */
export function QuickActionsBitcoin() {
  const navigate = useNavigate();

  return (
    <ActionsRow
      onSend={() => navigate("/send")}
      onReceive={() => navigate("/receive")}
      sendLabel="Envoyer"
      receiveLabel="Recevoir"
      trailing={
        SHOW_TESTNETS ? <BitcoinFaucetButton variant="ghost" /> : undefined
      }
    />
  );
}
