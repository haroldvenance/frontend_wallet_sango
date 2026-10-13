import { useNavigate } from "react-router-dom";

import { ActionsRow } from "@/components/ui/actions-row";
import { FaucetButton } from "./faucet-button";
import { useTranslation } from "@/i18n/use-translation";
import { SHOW_TESTNETS } from "@/lib/env-flags";

/**
 * Actions rapides SANGO — wrapper de `ActionsRow`.
 *
 * Send → /send, Receive → /receive, trailing = FaucetButton.
 * Les actions "Acheter" / "Échanger" sont désactivées (E1.6+).
 */
export function QuickActions() {
  const navigate = useNavigate();
  const t = useTranslation();

  return (
    <ActionsRow
      onSend={() => navigate("/send")}
      onReceive={() => navigate("/receive")}
      sendLabel={t.quickActions.send}
      receiveLabel={t.quickActions.receive}
      trailing={
        SHOW_TESTNETS ? <FaucetButton variant="ghost" /> : undefined
      }
    />
  );
}
