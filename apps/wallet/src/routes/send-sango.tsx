import type { AddressHex } from "@sango/types";
import { ArrowLeft, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { useAccount } from "@/hooks/use-account";
import { useTranslation } from "@/i18n/use-translation";
import { useSendTx } from "@/hooks/use-send-tx";
import { formatSango, parseSango } from "@/lib/format";
import { SangoCoinIcon } from "@/components/branding/sango-coin-icon";
import { FiatLine } from "@/components/branding/fiat-line";

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
      return toast.error(t.send.invalidAmount, { description: (err as Error).message });
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

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> {t.send.dashboardLink}
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">Envoyer</h1>
      {account && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t.send.available} : {formatSango(account.balance)} 
            <SangoCoinIcon size={14} className="inline-block align-text-bottom" />
            <span>SANGO</span>
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium">{t.send.recipient}</span>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t.send.recipientPlaceholder}
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium">{t.send.amount}</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.send.amountPlaceholder}
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {amount && (() => {
            try {
              return (
                <p className="mt-1.5 text-xs">
                  <FiatLine baseUnits={parseSango(amount).toString()} />
                </p>
              );
            } catch {
              return null;
            }
          })()}
        </label>

        <button
          type="submit"
          disabled={sendTx.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-4" />
          {sendTx.isPending ? t.send.sending : t.send.button}
        </button>
      </form>
    </div>
  );
}
