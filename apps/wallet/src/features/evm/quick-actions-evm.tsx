import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ActionsRow } from "@/components/ui/actions-row";
import { EvmFaucetButton } from "./evm-faucet-button";
import { useClipboard } from "@/hooks/use-clipboard";
import { useWalletStore } from "@/stores/wallet-store";
import { Bip39Wallet } from "@sango/wallet-core";

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
  const wallet = useWalletStore((s) => s.wallet);
  const copy = useClipboard();
  const [, setReceiveCopied] = useState(false);

  const bip39Wallet = wallet instanceof Bip39Wallet ? wallet : null;
  const address = bip39Wallet?.defaultAddress ?? "";

  return (
    <ActionsRow
      onSend={() => navigate("/send-evm")}
      onReceive={() => {
        copy(address, "Adresse copiée");
        setReceiveCopied(true);
        setTimeout(() => setReceiveCopied(false), 1500);
      }}
      sendLabel="Envoyer"
      receiveLabel="Recevoir"
      trailing={<EvmFaucetButton variant="ghost" />}
    />
  );
}
