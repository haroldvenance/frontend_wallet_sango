import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { formatSango, parseSango } from "@/lib/format";

// --- Types (union discriminée) --------------------------------------------

interface BaseProps {
  open: boolean;
  title: string;
  submitLabel: string;
  pending: boolean;
  hint?: string;
  onClose: () => void;
}

interface AmountProps extends BaseProps {
  mode: "amount";
  /** Montant max acceptable (base units) — pour valider. */
  max?: bigint;
  /** Valeur initiale du champ (ex. "100000"). */
  initialValue?: string;
  onSubmit: (amountBaseUnits: bigint) => Promise<void>;
}

interface CommissionProps extends BaseProps {
  mode: "commission";
  /** Valeur initiale du champ (ex. "7"). */
  initialValue?: string;
  /** Borne supérieure en % (max 10). */
  maxPct?: number;
  onSubmit: (commissionBps: number) => Promise<void>;
}

type Props = AmountProps | CommissionProps;

// --- Composant -------------------------------------------------------------

export function StakeModal(props: Props) {
  const t = useTranslation();
  const [value, setValue] = useState(props.initialValue ?? "");
  const [busy, setBusy] = useState(false);

  // Reset la valeur à chaque ouverture / changement de props.
  useEffect(() => {
    if (props.open) {
      setValue(props.initialValue ?? "");
    }
  }, [props.open, props.initialValue]);

  if (!props.open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (props.mode === "amount") {
      let base: bigint;
      try {
        base = parseSango(value);
      } catch (err) {
        toast.error(t.staking.invalidAmount, {
          description: (err as Error).message,
        });
        return;
      }
      if (base <= 0n) {
        toast.error(t.staking.amountPositive);
        return;
      }
      if (props.max !== undefined && base > props.max) {
        toast.error(t.staking.insufficientBalance, {
          description: `${t.staking.maxLabel} : ${formatSango(props.max)} SANGO`,
        });
        return;
      }
      setBusy(true);
      try {
        await props.onSubmit(base);
      } finally {
        setBusy(false);
      }
      return;
    }

    // mode commission
    const pct = Number.parseFloat(value.replace(",", "."));
    const maxPct = props.maxPct ?? 10;
    if (!Number.isFinite(pct) || pct < 0 || pct > maxPct) {
      toast.error(t.staking.invalidCommission ?? "Commission invalide", {
        description: `Entre 0 et ${maxPct} %`,
      });
      return;
    }
    const bps = Math.round(pct * 100);
    setBusy(true);
    try {
      await props.onSubmit(bps);
    } finally {
      setBusy(false);
    }
  }

  const isAmount = props.mode === "amount";
  const pending = props.pending || busy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{props.title}</h2>
          <button
            type="button"
            onClick={props.onClose}
            disabled={pending}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {props.hint && (
          <p className="mt-2 text-xs text-muted-foreground">{props.hint}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium">
              {isAmount ? t.staking.amount : t.staking.newCommissionLabel}
            </span>
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isAmount ? t.staking.amountPlaceholder : "7"}
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {isAmount && props.max !== undefined && (
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {t.staking.maxLabel} : {formatSango(props.max)} SANGO
              </span>
            )}
            {!isAmount && (
              <span className="mt-1 block text-[11px] text-muted-foreground">
                0 – {props.maxPct ?? 10} %
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.staking.sending : props.submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
