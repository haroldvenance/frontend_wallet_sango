import type { AddressHex } from "@sango/types";
import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FiatLine } from "@/components/branding/fiat-line";
import {
  SendBalanceCard,
  SendField,
  SendShell,
  SendSubmit,
} from "@/features/send/send-shell";
import { useAccount } from "@/hooks/use-account";
import { useSendTx } from "@/hooks/use-send-tx";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, parseSango } from "@/lib/format";

const HEX_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Envoi SANGO.
 *
 * ⚠️ P1 connu : le formulaire n'accepte QUE l'adresse hex (`0x…`).
 *    L'écran Receive expose du bech32m (`tsango1…`). Un utilisateur
 *    qui copie-colle son adresse de réception ne peut pas envoyer
 *    à lui-même. Solutions possibles :
 *      (a) accepter bech32m et convertir via wallet-core,
 *      (b) exposer l'hex sur l'écran Receive SANGO,
 *      (c) masquer bech32m tant que le mainnet n'existe pas.
 *    Décision produit requise avant release (cf. risques §F.1).
 */
export function SangoSendRoute() {
  const t = useTranslation();
  const { data: account, isLoading: accountLoading } = useAccount();
  const sendTx = useSendTx();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!HEX_ADDRESS_RE.test(to)) {
      return toast.error(t.send.invalidAddress);
    }
    let amountBaseUnits: bigint;
    try {
      amountBaseUnits = parseSango(amount);
    } catch {
      // On n'expose pas err.message (technique : "Too many decimals").
      return toast.error(t.send.invalidAmount);
    }
    if (amountBaseUnits <= 0n) return toast.error(t.send.amountPositive);

    if (account) {
      const balance = BigInt(account.balance);
      if (amountBaseUnits > balance) {
        return toast.error(t.send.insufficientBalance, {
          description: `${t.send.maxLabel} : ${formatSango(balance)} SANGO`,
        });
      }
    }

    await sendTx.mutateAsync({ to: to as AddressHex, amountBaseUnits });
  }

  const balanceStr = account
    ? formatSango(account.balance)
    : accountLoading
      ? "…"
      : "0";

  return (
    <SendShell
      assetId="sango"
      networkId="sango-devnet"
      title={`${t.send.button} SANGO`}
      subtitle={t.send.sango.subtitle}
      balanceCard={
        <SendBalanceCard
          assetId="sango"
          balance={balanceStr}
          symbol="SANGO"
        />
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <SendField label={t.send.recipient}>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t.send.recipientPlaceholder}
            spellCheck={false}
            autoComplete="off"
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3.5 font-mono text-xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </SendField>

        <SendField
          label={t.send.amount}
          hint={
            amount &&
            (() => {
              try {
                return <FiatLine baseUnits={parseSango(amount).toString()} />;
              } catch {
                return null;
              }
            })()
          }
        >
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.send.amountPlaceholder}
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </SendField>

        <SendSubmit
          label={t.send.button}
          pending={sendTx.isPending}
          pendingLabel={t.send.sending}
          icon={<Send className="size-4" />}
          assetId="sango"
        />
      </form>
    </SendShell>
  );
}