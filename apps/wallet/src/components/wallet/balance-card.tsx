import { Wallet } from "@sango/wallet-core";
import { ArrowDownToLine, ArrowUpFromLine, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { FiatLine } from "@/components/branding/fiat-line";
import { SangoCoinIcon } from "@/components/branding/sango-coin-icon";
import { FaucetButton } from "./faucet-button";
import { useAccount } from "@/hooks/use-account";
import { useChainInfo } from "@/hooks/use-chain-info";
import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango, shortenAddress } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

export function BalanceCard() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { data: account, isLoading } = useAccount();
  const { data: chainInfo } = useChainInfo();
  const copy = useClipboard();

  // Narrowing : le BalanceCard est SANGO-spécifique (bech32m, faucet
  // SANGO, affichage SANGO). Les wallets BIP-39 (EVM) auront une carte
  // dédiée en E1.5 — en attendant, `null` désactive l'affichage.
  const sangoWallet = wallet instanceof Wallet ? wallet : null;

  const bech32 = sangoWallet?.identity.addressBech32 ?? "—";
  const hex = sangoWallet?.identity.addressHex ?? "—";
  const balanceDisplay = account
    ? formatSango(account.balance)
    : isLoading
      ? "…"
      : "0.0000000";

  const networkLabel =
    chainInfo?.chainId === sangoWallet?.identity.network
      ? sangoWallet?.identity.network ?? "unknown"
      : sangoWallet?.identity.network ?? "unknown";

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SangoCoinIcon size={44} />
            <div>
              <p className="text-sm font-medium">{t.balance.totalBalance}</p>
              <p className="text-xs text-muted-foreground">{t.assets.sangoName}</p>
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
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <SangoCoinIcon size={18} />
              SANGO
            </span>
          </div>

          {account && (
            <p className="mt-2 text-sm">
              <FiatLine baseUnits={account.balance} />
            </p>
          )}

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

        <div className="mt-8 grid grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap">
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
            onClick={() => copy(hex, t.balance.addressCopied)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-background px-5 text-sm font-medium transition-all hover:bg-accent active:scale-[0.98]"
          >
            <ArrowDownToLine className="size-4" />
            {t.balance.receive}
          </button>

          <FaucetButton />
        </div>

        {account && (
          <p className="mt-5 text-[11px] text-muted-foreground">
            {t.balance.nonce} : {account.nonce} ·{" "}
            {account.publicKey
              ? t.balance.keyRegistered
              : t.balance.keyNotRegistered}
          </p>
        )}
      </div>
    </section>
  );
}
