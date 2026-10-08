import { Check } from "lucide-react";

import { useTranslation } from "@/i18n/use-translation";
import { formatNativeShort } from "@/lib/eth";

interface Props {
  readonly index: number;
  readonly address: string;
  readonly balance: bigint | null;
  readonly loading: boolean;
  readonly isActive: boolean;
  readonly onSelect: () => void;
}

/**
 * Row "Compte N" dans `WalletsAndAccountsModal` — Phase 3.3.
 *
 * Rendue uniquement pour les wallets BIP-39 **dépliés**. Le clic
 * appelle `switchAccount(index)`.
 */
export function AccountRow({
  index,
  address,
  balance,
  loading,
  isActive,
  onSelect,
}: Props) {
  const t = useTranslation();

  const label = t.accounts.accountN.replace("{n}", String(index + 1));
  const addressShort = address
    ? `${address.slice(0, 10)}…${address.slice(-4)}`
    : "—";
  const balanceStr = loading
    ? "…"
    : balance !== null
      ? formatNativeShort(balance)
      : "—";

  return (
    <button
      type="button"
      data-testid={`account-row-${index}`}
      onClick={onSelect}
      disabled={isActive}
      className={[
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        isActive
          ? "border-primary/40 bg-primary/5"
          : "border-transparent hover:bg-accent",
      ].join(" ")}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {addressShort}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm">{balanceStr}</p>
      </div>
      {isActive && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}
