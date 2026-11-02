import type { Address, Token } from "@sango/wallet-chains";
import { MAX_UINT256 } from "@sango/wallet-chains";
import {
  ArrowLeft,
  CheckCircle2,
  Infinity as InfinityIcon,
  ShieldAlert,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { MainnetWarning } from "@/features/evm/mainnet-warning";
import { useApproveEvm } from "@/hooks/use-approve-evm";
import { useEvmAllowance } from "@/hooks/use-evm-allowance";
import { useEvmTokens } from "@/hooks/use-evm-tokens";
import { useTranslation } from "@/i18n/use-translation";
import {
  formatTokenAmount,
  isValidEvmAddress,
  parseTokenAmount,
} from "@/lib/eth";
import { useWalletStore } from "@/stores/wallet-store";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function ApprovalsRoute() {
  const t = useTranslation();
  const networkId = useWalletStore((s) => s.networkId);
  const { data: tokensWithBalance, isLoading: tokensLoading } = useEvmTokens();
  const approve = useApproveEvm();

  const availableTokens = (tokensWithBalance ?? []).map((x) => x.token);

  const [selectedContract, setSelectedContract] = useState("");
  const [spender, setSpender] = useState("");
  const [exactAmount, setExactAmount] = useState("");

  const selectedToken: Token | null =
    availableTokens.find((x) => x.contract === selectedContract) ?? null;
  const spenderTrimmed = spender.trim();
  const spenderValid = isValidEvmAddress(spenderTrimmed);
  const spenderIsZero = spenderTrimmed.toLowerCase() === ZERO_ADDRESS;
  const readyForRead = selectedToken !== null && spenderValid && !spenderIsZero;

  const { data: allowanceData, isLoading: allowanceLoading } = useEvmAllowance(
    readyForRead ? selectedToken : null,
    readyForRead ? (spenderTrimmed as Address) : null,
  );

  const allowance: bigint | null = allowanceData?.amount ?? null;
  const isZero = allowance === 0n;
  const isUnlimited = allowance === MAX_UINT256;

  function formatAllowance(a: bigint, token: Token): string {
    if (a === 0n) return t.approvals.allowanceNone;
    if (a === MAX_UINT256) return t.approvals.allowanceUnlimited;
    return `${formatTokenAmount(a, token.metadata.decimals)} ${token.metadata.symbol}`;
  }

  async function onRevoke() {
    if (!selectedToken || !spenderValid || spenderIsZero) return;
    await approve.mutateAsync({
      token: selectedToken,
      spender: spenderTrimmed as Address,
      amountBaseUnits: 0n,
    });
  }

  async function onApproveExact(e: FormEvent) {
    e.preventDefault();
    if (!selectedToken || !spenderValid || spenderIsZero || !exactAmount) return;
    let amount: bigint;
    try {
      amount = parseTokenAmount(exactAmount, selectedToken.metadata.decimals);
    } catch {
      return;
    }
    await approve.mutateAsync({
      token: selectedToken,
      spender: spenderTrimmed as Address,
      amountBaseUnits: amount,
    });
    setExactAmount("");
  }

  async function onApproveUnlimited() {
    if (!selectedToken || !spenderValid || spenderIsZero) return;
    await approve.mutateAsync({
      token: selectedToken,
      spender: spenderTrimmed as Address,
      amountBaseUnits: MAX_UINT256,
    });
  }

  const buttonsDisabled = approve.isPending || spenderIsZero;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="size-3" /> {t.approvals.back}
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        {t.approvals.title}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {t.approvals.subtitle}
      </p>

      <MainnetWarning networkId={networkId} className="mt-4" />

      {tokensLoading ? (
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      ) : availableTokens.length === 0 ? (
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {t.approvals.noTokens}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium">
              {t.approvals.tokenLabel}
            </span>
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— {t.approvals.tokenPlaceholder} —</option>
              {availableTokens.map((x) => (
                <option key={x.contract} value={x.contract}>
                  {x.metadata.symbol} — {x.metadata.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium">
              {t.approvals.spenderLabel}
            </span>
            <input
              type="text"
              value={spender}
              onChange={(e) => setSpender(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {spenderTrimmed && !spenderValid && (
              <p className="mt-1 text-[11px] text-destructive">
                {t.approvals.spenderInvalid}
              </p>
            )}
          </label>

          {spenderIsZero && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-[11px] text-destructive">
              <ShieldAlert className="mt-0.5 size-3 shrink-0" />
              <span>{t.approvals.zeroSpender}</span>
            </div>
          )}

          {readyForRead && selectedToken && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t.approvals.currentAllowance}
              </p>

              {allowanceLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.common.loading}
                </p>
              ) : allowance !== null ? (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    {isUnlimited && (
                      <InfinityIcon className="size-5 text-amber-500" />
                    )}
                    {isZero && (
                      <CheckCircle2 className="size-5 text-muted-foreground" />
                    )}
                    <span className="font-mono text-lg font-semibold">
                      {formatAllowance(allowance, selectedToken)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {!isZero && (
                      <button
                        type="button"
                        onClick={onRevoke}
                        disabled={buttonsDisabled}
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:opacity-50"
                      >
                        {t.approvals.revoke} ({selectedToken.metadata.symbol})
                      </button>
                    )}

                    <form onSubmit={onApproveExact} className="flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={exactAmount}
                        onChange={(e) => setExactAmount(e.target.value)}
                        placeholder={`${t.approvals.exactAmount} (${selectedToken.metadata.symbol})`}
                        className="flex h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <button
                        type="submit"
                        disabled={buttonsDisabled || !exactAmount}
                        className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
                      >
                        {t.approvals.approve}
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={onApproveUnlimited}
                      disabled={buttonsDisabled || isUnlimited}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50 dark:text-amber-400"
                    >
                      <InfinityIcon className="size-4" />
                      {t.approvals.approveUnlimited}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}