import type { Address, Token } from "@sango/wallet-chains";
import { evmNetworkById } from "@sango/wallet-chains";
import { Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ExplorerLinkEvm } from "@/features/evm/explorer-link-evm";
import {
  AssetSelect,
  type AssetSelectOption,
} from "@/features/send/asset-select";
import {
  SendBalanceCard,
  SendField,
  SendShell,
  SendSubmit,
} from "@/features/send/send-shell";
import { MainnetWarning } from "@/features/evm/mainnet-warning";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { useEvmTokens } from "@/hooks/use-evm-tokens";
import { useSendEvm } from "@/hooks/use-send-evm";
import { useNetworkQueryContext } from "@/hooks/use-network-query-context";
import { useTranslation } from "@/i18n/use-translation";
import {
  formatNativeShort,
  formatStablecoinUsd,
  formatTokenAmount,
  isValidEvmAddress,
  parseEth,
  parseTokenAmount,
} from "@/lib/eth";
import { useWalletSession } from "@/providers/wallet-session-context";

export function SendEvmRoute() {
  const t = useTranslation();
  const session = useWalletSession();
  const { account, networkId, nativeAsset } = useNetworkQueryContext();
  const { data: evmAccount } = useEvmAccount();
  const { data: tokensWithBalance } = useEvmTokens();
  const sendEvm = useSendEvm();

  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;

  const [searchParams] = useSearchParams();
  const prefillAsset = searchParams.get("asset")?.toLowerCase() ?? null;

  const [selected, setSelected] = useState<string>("eth");
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (!prefillAsset) {
      prefillAppliedRef.current = true;
      return;
    }
    if (!tokensWithBalance) return;
    if (prefillAsset === nativeAsset) {
      setSelected("eth");
      prefillAppliedRef.current = true;
      return;
    }
    const match = tokensWithBalance.find(
      (tt) =>
        tt.token.assetId.toLowerCase() === prefillAsset ||
        tt.token.metadata.symbol.toLowerCase() === prefillAsset,
    );
    if (match) setSelected(match.token.contract);
    prefillAppliedRef.current = true;
  }, [prefillAsset, tokensWithBalance, nativeAsset]);

  const selectedToken: Token | undefined = tokensWithBalance?.find(
    (x) => x.token.contract === selected,
  )?.token;

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [totalFeeWei, setTotalFeeWei] = useState<bigint | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const selectedBalance: bigint | null = (() => {
    if (selected === "eth") return evmAccount?.balance ?? null;
    const entry = tokensWithBalance?.find((tt) => tt.token.contract === selected);
    return entry?.balance ?? null;
  })();

  useEffect(() => {
    if (!session || !to || !amount) {
      setTotalFeeWei(null);
      return;
    }
    if (!isValidEvmAddress(to)) {
      setTotalFeeWei(null);
      return;
    }

    let amountBaseUnits: bigint;
    try {
      if (selectedToken) {
        amountBaseUnits = parseTokenAmount(
          amount,
          selectedToken.metadata.decimals,
        );
      } else {
        amountBaseUnits = parseEth(amount);
      }
    } catch {
      setTotalFeeWei(null);
      return;
    }

    const assetRef = selectedToken
      ? ({
          kind: "token",
          networkId,
          contract: selectedToken.contract,
        } as const)
      : ({
          kind: "native",
          assetId: nativeAsset ?? "eth",
          networkId,
        } as const);

    let cancelled = false;
    setFeeLoading(true);
    session
      .estimateFee(
        {
          from: to as Address,
          to: to as Address,
          assetRef,
          amount: amountBaseUnits,
        },
        account,
      )
      .then((est) => {
        if (!cancelled) setTotalFeeWei(est.total);
      })
      .catch(() => {
        if (!cancelled) setTotalFeeWei(null);
      })
      .finally(() => {
        if (!cancelled) setFeeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, to, amount, networkId, account, selectedToken, nativeAsset]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!isValidEvmAddress(to)) {
      return toast.error(t.send.evm.invalidAddress, {
        description: t.send.evm.invalidAddressDesc,
      });
    }

    let amountBaseUnits: bigint;
    try {
      if (selectedToken) {
        amountBaseUnits = parseTokenAmount(
          amount,
          selectedToken.metadata.decimals,
        );
      } else {
        amountBaseUnits = parseEth(amount);
      }
    } catch {
      return toast.error(t.send.evm.invalidAmount);
    }

    if (amountBaseUnits <= 0n) {
      return toast.error(t.send.evm.amountPositive);
    }

    if (selectedBalance !== null && amountBaseUnits > selectedBalance) {
      const symbol = selectedToken?.metadata.symbol ?? "ETH";
      const displayed = selectedToken
        ? formatTokenAmount(selectedBalance, selectedToken.metadata.decimals)
        : formatNativeShort(selectedBalance);
      return toast.error(t.send.evm.insufficientBalance, {
        description: `${t.send.balanceDesc.replace("{value}", displayed)} ${symbol}`,
      });
    }

    if (evmAccount && totalFeeWei !== null && evmAccount.balance < totalFeeWei) {
      return toast.error(t.send.evm.insufficientFee, {
        description: t.send.evm.feeEstimateDesc.replace(
          "{value}",
          formatNativeShort(totalFeeWei),
        ),
      });
    }

    try {
      const { txHash } = await sendEvm.mutateAsync({
        to: to as Address,
        amountBaseUnits,
        token: selectedToken,
      });
      setLastTxHash(txHash);
      setTo("");
      setAmount("");
      setTotalFeeWei(null);
    } catch {
      /* toast déclenché par onError */
    }
  }

  const nativeSymbol = (nativeAsset ?? "eth").toUpperCase();
  const symbol = selectedToken?.metadata.symbol ?? nativeSymbol;

  const assetOptions: AssetSelectOption[] = [
    {
      id: "eth",
      assetId: nativeAsset ?? "eth",
      symbol: nativeSymbol,
      name: `${nativeSymbol} · natif`,
      balance: evmAccount ? formatNativeShort(evmAccount.balance) : "…",
      isNative: true,
    },
    ...(tokensWithBalance ?? []).map(({ token, balance }) => ({
      id: token.contract,
      assetId: token.assetId,
      symbol: token.metadata.symbol,
      name: token.metadata.name,
      balance:
        balance === null
          ? "—"
          : formatTokenAmount(balance, token.metadata.decimals),
      isNative: false,
    })),
  ];

  const balanceDisplay = (() => {
    if (selectedBalance !== null) {
      if (selectedToken) {
        return formatTokenAmount(
          selectedBalance,
          selectedToken.metadata.decimals,
        );
      }
      return formatNativeShort(selectedBalance);
    }
    return "…";
  })();

  return (
    <SendShell
      assetId={
        selected === "eth"
          ? (nativeAsset ?? "eth")
          : (selectedToken?.assetId ?? nativeAsset ?? "eth")
      }
      networkId={networkId}
      title={`${t.send.button} ${symbol}`}
      subtitle={networkName}
      balanceCard={
        <SendBalanceCard
          assetId={
            selected === "eth"
              ? (nativeAsset ?? "eth")
              : (selectedToken?.assetId ?? nativeAsset ?? "eth")
          }
          balance={balanceDisplay}
          symbol={symbol}
        />
      }
    >
      {lastTxHash && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">
            {t.send.evm.txSent}
          </p>
          <p className="mt-1 font-mono break-all text-muted-foreground">
            {lastTxHash}
          </p>
          <div className="mt-2">
            <ExplorerLinkEvm hash={lastTxHash} />
          </div>
        </div>
      )}

      <MainnetWarning networkId={networkId} className="mt-4" />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium">
            {t.send.evm.asset}
          </span>
          <AssetSelect
            value={selected}
            onChange={(id) => {
              setSelected(id);
              setAmount("");
              setTotalFeeWei(null);
            }}
            options={assetOptions}
          />
        </div>

        <SendField label={t.send.recipient}>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t.send.evm.recipientPlaceholder}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3.5 font-mono text-xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </SendField>

        <SendField label={`${t.send.amount} (${symbol})`}>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={
                selectedToken
                  ? t.send.evm.amountPlaceholderToken
                  : t.send.evm.amountPlaceholderNative
              }
              className="flex h-12 w-full rounded-xl border border-input bg-background px-3.5 pr-16 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            {selectedBalance !== null && selectedBalance > 0n && (
              <button
                type="button"
                onClick={() => {
                  if (selectedToken) {
                    setAmount(
                      formatTokenAmount(
                        selectedBalance,
                        selectedToken.metadata.decimals,
                      ),
                    );
                  } else {
                    const reserve = 10n ** 14n; // 0.0001 ETH
                    const max =
                      selectedBalance > reserve
                        ? selectedBalance - reserve
                        : 0n;
                    setAmount(formatNativeShort(max));
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {t.send.maxLabel}
              </button>
            )}
          </div>
        </SendField>
        {selectedToken && amount && (
          <p className="text-xs text-muted-foreground">
            ≈{" "}
            {(() => {
              try {
                return formatStablecoinUsd(
                  parseTokenAmount(amount, selectedToken.metadata.decimals),
                  selectedToken.metadata.decimals,
                );
              } catch {
                return "—";
              }
            })()}
          </p>
        )}

        {totalFeeWei !== null && (
          <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <div className="flex justify-between font-medium text-foreground">
              <span>{t.send.evm.feeEstimateLabel}</span>
              <span className="font-mono">
                {formatNativeShort(totalFeeWei)} ETH
              </span>
            </div>
          </div>
        )}
        {feeLoading && totalFeeWei === null && (
          <p className="text-[11px] text-muted-foreground">
            {t.send.evm.feeEstimating}
          </p>
        )}

        <SendSubmit
          label={`${t.send.button} ${symbol}`}
          pending={sendEvm.isPending}
          pendingLabel={t.send.sending}
          icon={<Send className="size-4" />}
        />
      </form>
    </SendShell>
  );
}