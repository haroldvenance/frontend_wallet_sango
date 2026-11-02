import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { useAccounts } from "@/hooks/use-accounts";
import { useSangoWallet } from "@/hooks/use-sango-wallet";
import { useTranslation } from "@/i18n/use-translation";
import { truncateMiddle } from "@/lib/format";
import { useWallets } from "@/hooks/use-wallets";

import { WalletsAndAccountsModal } from "./wallets-and-accounts-modal";

export function WalletSwitcher() {
  const t = useTranslation();
  const { activeWallet } = useWallets();
  const accounts = useAccounts();
  const sangoWallet = useSangoWallet();
  const [open, setOpen] = useState(false);

  if (!activeWallet) return null;

  const activeAccount =
    accounts && accounts.accounts.length > 0
      ? accounts.accounts.find((a) => a.index === accounts.activeIndex)
      : null;

  const rawAddress =
    activeAccount?.address ??
    sangoWallet?.identity.addressBech32 ??
    "";
  const addressShort = rawAddress ? truncateMiddle(rawAddress, 10, 4) : "—";

  const accountCount = activeWallet.accountCount;
  const countLabel =
    accountCount === 1
      ? t.wallets.accountCount.replace("{n}", "1")
      : t.wallets.accountCountPlural.replace("{n}", String(accountCount));

  const label = t.wallets.labelPattern.replace(
    "{n}",
    String(activeWallet.position),
  );

  const accountIndex = accounts?.activeIndex ?? null;
  const subtitle =
    accountIndex !== null
      ? `${t.wallets.currentAccount.replace("{n}", String(accountIndex + 1))} · ${addressShort}`
      : addressShort;

  return (
    <>
      <button
        type="button"
        data-testid="wallet-switcher-card"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
          W{activeWallet.position}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{label}</p>
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {t.wallets.primary}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted-foreground">{countLabel}</p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <WalletsAndAccountsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}