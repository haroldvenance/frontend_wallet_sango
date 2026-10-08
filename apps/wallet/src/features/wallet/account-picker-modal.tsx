import { Check, Plus, X } from "lucide-react";

import { useTranslation } from "@/i18n/use-translation";
import { formatNativeShort } from "@/lib/eth";
import type { UseAccountsResult } from "@/hooks/use-accounts";

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly accounts: UseAccountsResult;
}

/**
 * Modal de sélection de compte — Phase 2.3.
 */
export function AccountPickerModal({ open, onClose, accounts }: Props) {
  const t = useTranslation();

  if (!open) return null;

  const { accounts: list, activeIndex, switchAccount, addAccount } = accounts;

  function onSelect(index: number) {
    switchAccount(index);
    onClose();
  }

  function onAdd() {
    addAccount();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="account-picker-modal"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            {t.accounts.pickerTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.cancel}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {list.map((acc) => {
            const isActive = acc.index === activeIndex;
            const label = t.accounts.accountN.replace(
              "{n}",
              String(acc.index + 1),
            );
            const addressShort = `${acc.address.slice(0, 10)}…${acc.address.slice(-4)}`;
            const balanceStr = acc.loading
              ? "…"
              : acc.balance !== null
                ? formatNativeShort(acc.balance)
                : "—";

            return (
              <button
                key={acc.index}
                type="button"
                data-testid={`account-option-${acc.index}`}
                onClick={() => onSelect(acc.index)}
                disabled={isActive}
                className={[
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:bg-accent",
                ].join(" ")}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {acc.index + 1}
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
                {isActive && (
                  <Check className="size-4 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t p-3">
          <button
            type="button"
            data-testid="account-add-button"
            onClick={onAdd}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="size-4" />
            {t.accounts.addAccount}
          </button>
        </div>
      </div>
    </div>
  );
}
