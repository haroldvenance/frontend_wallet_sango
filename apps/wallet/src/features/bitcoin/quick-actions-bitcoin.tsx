import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ActionsRow } from "@/components/ui/actions-row";
import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useClipboard } from "@/hooks/use-clipboard";

/**
 * Actions rapides Bitcoin — E2.1.b.6.3.
 *
 * Send → /send (dispatch vers SendBitcoinRoute).
 * Receive → copie l'adresse `tb1q…` (pas de modal dédié en 6.3,
 * même pattern que `QuickActionsEvm`).
 *
 * Pas de faucet en 6.3 (viendra en 6.4).
 */
export function QuickActionsBitcoin() {
  const navigate = useNavigate();
  const addressInfo = useBitcoinAddress();
  const copy = useClipboard();
  const [, setReceiveCopied] = useState(false);

  return (
    <ActionsRow
      onSend={() => navigate("/send")}
      onReceive={() => {
        if (addressInfo) {
          copy(addressInfo.address, "Adresse copiée");
          setReceiveCopied(true);
          setTimeout(() => setReceiveCopied(false), 1500);
        }
      }}
      sendLabel="Envoyer"
      receiveLabel="Recevoir"
    />
  );
}
