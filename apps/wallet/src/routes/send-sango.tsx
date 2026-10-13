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

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function SangoSendRoute() {
  const t = useTranslation();
  const { data: account } = useAccount();
  const sendTx = useSendTx();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ADDRESS_RE.test(to)) {
      return toast.error(t.send.invalidAddress);
    }
    let amountBaseUnits: bigint;
    try {
      amountBaseUnits = parseSango(amount);
    } catch (err) {
      return toast.error(t.send.invalidAmount, {
        description: (err as Error).message,
      });
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

  const balanceStr = account ? formatSango(account.balance) : "0";

  return (
    <SendShell
      title={`Envoyer SANGO`}
      subtitle="Sango native chain"
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
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </SendField>

        <SendField
          label={t.send.amount}
          hint={
            amount && (() => {
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
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </SendField>

        <SendSubmit
          label={t.send.button}
          pending={sendTx.isPending}
          pendingLabel={t.send.sending}
          icon={<Send className="size-4" />}
        />
      </form>
    </SendShell>
  );
}
