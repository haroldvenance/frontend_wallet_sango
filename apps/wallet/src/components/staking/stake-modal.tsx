import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { formatSango, parseSango } from "@/lib/format";

interface Props {
  open: boolean;
  title: string;
  submitLabel: string;
  pending: boolean;
  /** Montant max acceptable (base units) — pour valider. */
  max?: bigint;
  /** Montant déjà affiché (optionnel) pour info. */
  hint?: string;
  onSubmit: (amountBaseUnits: bigint) => Promise<void>;
  onClose: () => void;
}

export function StakeModal({
  open,
  title,
  submitLabel,
  pending,
  max,
  hint,
  onSubmit,
  onClose,
}: Props) {
  const t = useTranslation();
  const [amount, setAmount] = useState("");

  if (!open) return null;

  async function handle(e: FormEvent) {
    e.preventDefault();
    let base: bigint;
    try {
      base = parseSango(amount);
    } catch (err) {
      return toast.error(t.staking.invalidAmount, { description: (err as Error).message });
    }
    if (base <= 0n) return toast.error(t.staking.amountPositive);
    if (max !== undefined && base > max) {
      return toast.error(t.staking.insufficientBalance, {
        description: `${t.staking.maxLabel} : ${formatSango(max)} SANGO`,
      });
    }
    await onSubmit(base);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}

        <form onSubmit={handle} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium">{t.staking.amount}</span>
            <input
              type="text"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t.staking.amountPlaceholder}
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {max !== undefined && (
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {t.staking.maxLabel} : {formatSango(max)} SANGO
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.staking.sending : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
