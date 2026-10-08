import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { useAccounts } from "@/hooks/use-accounts";
import { useSangoWallet } from "@/hooks/use-sango-wallet";
import { useTranslation } from "@/i18n/use-translation";
import { truncateMiddle } from "@/lib/format";
import { useWallets } from "@/hooks/use-wallets";

import { WalletsAndAccountsModal } from "./wallets-and-accounts-modal";

/**
 * Card dashboard du wallet actif — Phase 3.3 (D1·A).
 *
 * Affiche **wallet + compte** en une ligne, comme dans le mockup :
 *
 *   W1  Portefeuille 1  [Principal]                       ⌄
 *       Compte 1 · sango1q8…x7k4f          2 comptes
 *
 * **D13·A** — `null` si aucun wallet déverrouillé (après `lock()`).
 *
 * **D14·A** — l'état `open` est local. Un futur second point
 * d'entrée (Settings, Autres cryptos) réutilisera directement
 * `WalletsAndAccountsModal` sans store UI global.
 *
 * Pour SANGO legacy (`useAccounts()` → `null`) : le sous-titre
 * adresse/compte utilise le bech32m du wallet.
 */
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

  // Adresse du compte actif (BIP-39), sinon fallback bech32m SANGO.
  const rawAddress =
    activeAccount?.address ??
    sangoWallet?.identity.addressBech32 ??
    "";
  // Phase 4.2 (D2·A) — convention 10…4 via helper partagé.
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

  // Sous-titre : "Compte N · adresse" (BIP-39) ou juste l'adresse (SANGO).
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
        className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40"
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

      <WalletsAndAccountsModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
