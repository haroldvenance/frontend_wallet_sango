import { ArrowDownToLine, ArrowUpFromLine, Copy, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAccount } from "@/hooks/use-account";
import { useTranslation } from "@/i18n/use-translation";
import { useChainInfo } from "@/hooks/use-chain-info";
import { useClipboard } from "@/hooks/use-clipboard";
import { formatSango, shortenAddress } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

export function BalanceCard() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { data: account, isLoading } = useAccount();
  const { data: chainInfo } = useChainInfo();
  const copy = useClipboard();

  const bech32 = wallet?.identity.addressBech32 ?? "—";
  const hex = wallet?.identity.addressHex ?? "—";
  const balanceDisplay = account
    ? formatSango(account.balance)
    : isLoading
      ? "…"
      : "0.0000000";

  const networkLabel = chainInfo?.chainId === wallet?.identity.network
    ? wallet?.identity.network ?? "unknown"
    : wallet?.identity.network ?? "unknown";

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{t.balance.totalBalance}</p>
              <p className="text-xs text-muted-foreground">SangoCoin · SANGO</p>
            </div>
          </div>

          <span className="rounded-full border bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
            {networkLabel}
          </span>
        </div>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t.balance.availableBalance}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {balanceDisplay}
            </span>
            <span className="text-sm font-medium text-muted-foreground">SANGO</span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-xs text-muted-foreground">
              {shortenAddress(bech32, 10)}
            </span>
            <button
              type="button"
              onClick={() => copy(hex, t.balance.addressCopied)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Copy wallet address"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/send")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <ArrowUpFromLine className="size-4" />
            {t.balance.send}
          </button>
          <button
            type="button"
            onClick={() => copy(hex, "Adresse copiée")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-background px-5 text-sm font-medium transition-all hover:bg-accent active:scale-[0.98]"
          >
            <ArrowDownToLine className="size-4" />
            {t.balance.receive}
          </button>
        </div>

        {account && (
          <p className="mt-5 text-[11px] text-muted-foreground">
            {t.balance.nonce} : {account.nonce} · {account.publicKey ? t.balance.keyRegistered : t.balance.keyNotRegistered}
          </p>
        )}
      </div>
    </section>
  );
}
