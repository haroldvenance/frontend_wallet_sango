import { useState } from "react";

import { SangoIcon } from "@/components/branding/sango-icon";
import { useAccounts } from "@/hooks/use-accounts";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

import { AccountPickerModal } from "./account-picker-modal";

/**
 * Card du wallet actif — Phase 2.3.
 *
 * Ne s'affiche **pas** pour SANGO legacy (`useAccounts()` retourne
 * `null`).
 */
export function AccountSwitcher() {
  const t = useTranslation();
  const accounts = useAccounts();
  const activeId = useWalletStore((s) => s.activeId);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!accounts) return null;

  const { accounts: list, activeIndex } = accounts;
  const active = list.find((a) => a.index === activeIndex) ?? list[0];
  const addressShort = active
    ? `${active.address.slice(0, 10)}…${active.address.slice(-4)}`
    : "—";

  const accountCount = list.length;
  const countLabel =
    accountCount === 1
      ? t.accounts.accountCount.replace("{n}", "1")
      : t.accounts.accountCountPlural.replace("{n}", String(accountCount));

  return (
    <>
      <button
        type="button"
        data-testid="account-switcher-card"
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40"
      >
        <div className="relative shrink-0">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            W
          </div>
          <SangoIcon
            size={16}
            className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {activeId ? t.accounts.walletFallbackLabel : "—"}
            </p>
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {t.accounts.primary}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {addressShort}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted-foreground">{countLabel}</p>
        </div>
        <svg
          className="size-4 shrink-0 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
        </svg>
      </button>

      <AccountPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        accounts={accounts}
      />
    </>
  );
}
