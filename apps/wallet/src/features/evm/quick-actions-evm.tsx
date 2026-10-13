import { useNavigate } from "react-router-dom";

import { ActionsRow } from "@/components/ui/actions-row";
import { EvmFaucetButton } from "./evm-faucet-button";

import { SHOW_TESTNETS } from "@/lib/env-flags";

/**
 * Actions rapides EVM — wrapper de `ActionsRow`.
 *
 * Symétrique de `QuickActions` (SANGO) :
 *   - Send → /send-evm
 *   - Receive → copie l'adresse (pas de modal dédié en E1.5)
 *   - Faucet → lien externe (E1.7.d.2), visible uniquement sur
 *     testnet EVM. Le composant `EvmFaucetButton` retourne `null`
 *     sur mainnet — pas de branchement conditionnel ici.
 */
export function QuickActionsEvm() {
  const navigate = useNavigate();

  return (
    <ActionsRow
      onSend={() => navigate("/send")}
      onReceive={() => navigate("/receive")}
      sendLabel="Envoyer"
      receiveLabel="Recevoir"
      trailing={
        SHOW_TESTNETS ? <EvmFaucetButton variant="ghost" /> : undefined
      }
    />
  );
}
