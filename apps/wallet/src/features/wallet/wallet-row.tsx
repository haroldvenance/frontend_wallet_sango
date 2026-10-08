import { ChevronRight, Plus } from "lucide-react";

import { useAccounts } from "@/hooks/use-accounts";
import { useTranslation } from "@/i18n/use-translation";
import type { WalletSummary } from "@/hooks/use-wallets";

import { AccountRow } from "./account-row";

interface Props {
  readonly wallet: WalletSummary;
  readonly isExpanded: boolean;
  readonly onSelect: () => void;
}

/**
 * Row wallet dans `WalletsAndAccountsModal` — Phase 3.3.
 *
 * - **Replié** : avatar `Wn` + label + `accountCount` + chevron.
 * - **Déplié** : idem + liste des `AccountRow` (BIP-39 uniquement)
 *   + bouton "Ajouter un compte".
 *
 * **D10·A** — le clic déclenche `switchWallet(id)` **et** l'expand.
 * Le wallet déplié est donc toujours l'actif (D-Phase3-3).
 *
 * **D7** — les balances ne sont chargées que pour le wallet déplié
 * (`useAccounts(wallet.id, { enabled: isExpanded })`). Un wallet
 * replié ne fait aucune requête RPC.
 *
 * **D16·C** — pas de menu `⋯` en 3.3 (ajouté en 3.4).
 */
export function WalletRow({ wallet, isExpanded, onSelect }: Props) {
  const t = useTranslation();

  // Toujours appelé (règle des hooks) — `enabled` coupe les queries
  // tant que la row est repliée.
  const accounts = useAccounts(wallet.id, { enabled: isExpanded });

  const label = t.wallets.labelPattern.replace(
    "{n}",
    String(wallet.position),
  );
  const accountCountLabel =
    wallet.accountCount === 1
      ? t.wallets.accountCount.replace("{n}", "1")
      : t.wallets.accountCountPlural.replace(
          "{n}",
          String(wallet.accountCount),
        );
  const subtitle =
    wallet.format === "sango-legacy"
      ? t.wallets.formatSango
      : t.wallets.formatBip39;

  return (
    <div
      className={[
        "rounded-2xl border transition-colors",
        isExpanded
          ? "border-primary/40 bg-primary/[0.02]"
          : "border-transparent hover:bg-accent/40",
      ].join(" ")}
    >
      <button
        type="button"
        data-testid={`wallet-row-${wallet.id}`}
        onClick={onSelect}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          W{wallet.position}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{label}</p>
            {wallet.isActive && (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {t.wallets.primary}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {subtitle} · {accountCountLabel}
          </p>
        </div>
        {!isExpanded && (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 border-t px-3 pb-3 pt-3">
          {accounts?.accounts.map((acc) => (
            <AccountRow
              key={acc.index}
              index={acc.index}
              address={acc.address}
              balance={acc.balance}
              loading={acc.loading}
              isActive={acc.index === accounts.activeIndex}
              onSelect={() => accounts.switchAccount(acc.index)}
            />
          ))}

          {accounts && (
            <button
              type="button"
              data-testid={`wallet-add-account-${wallet.id}`}
              onClick={() => accounts.addAccount()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <Plus className="size-3.5" />
              {t.wallets.addAccount}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
