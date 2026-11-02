import { bitcoinNetworkById } from "@sango/wallet-chains";
import type { Address } from "@sango/wallet-chains";
import type { BitcoinNetwork } from "@sango/wallet-core";
import { Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { MainnetWarning } from "@/features/evm/mainnet-warning";
import {
  SendBalanceCard,
  SendField,
  SendShell,
  SendSubmit,
} from "@/features/send/send-shell";
import { useBitcoinBalance } from "@/hooks/use-bitcoin-balance";
import { useBitcoinFeeRates } from "@/hooks/use-bitcoin-fee-rates";
import { useSendBitcoin } from "@/hooks/use-send-bitcoin";
import { useNetworkQueryContext } from "@/hooks/use-network-query-context";
import { useTranslation } from "@/i18n/use-translation";
import {
  formatBitcoin,
  isValidBitcoinAddress,
  parseBitcoin,
} from "@/lib/bitcoin";

type FeePriority = "fast" | "normal" | "slow" | "custom";

export function SendBitcoinRoute() {
  const t = useTranslation();
  const { networkId } = useNetworkQueryContext();
  const network = bitcoinNetworkById(networkId);
  const btcNetwork: BitcoinNetwork =
    networkId === "bitcoin-mainnet" ? "mainnet" : "testnet";

  const { data: balance, isLoading: balanceLoading } = useBitcoinBalance();
  const { data: feeRates, isLoading: feeLoading } = useBitcoinFeeRates();
  const send = useSendBitcoin();

  const [to, setTo] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [priority, setPriority] = useState<FeePriority>("normal");
  const [customRate, setCustomRate] = useState("");
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const effectiveRate: bigint | null = useMemo(() => {
    if (priority === "custom") {
      const n = Number.parseInt(customRate, 10);
      return Number.isFinite(n) && n > 0 ? BigInt(n) : null;
    }
    if (!feeRates) return null;
    if (priority === "fast") return feeRates.fast;
    if (priority === "normal") return feeRates.normal;
    return feeRates.slow;
  }, [priority, customRate, feeRates]);

  const estimatedVsize = 140n;
  const estimatedFeeSats = effectiveRate
    ? effectiveRate * estimatedVsize
    : null;

  const toTrimmed = to.trim();
  const toValid = toTrimmed
    ? isValidBitcoinAddress(toTrimmed, btcNetwork)
    : false;

  const balanceDisplay = balance
    ? formatBitcoin(balance.amount)
    : balanceLoading
      ? "…"
      : "0";

  const recipientPlaceholder =
    btcNetwork === "mainnet"
      ? t.send.bitcoin.recipientPlaceholder
      : t.send.bitcoin.recipientPlaceholderTestnet;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!toValid) {
      return toast.error(t.send.bitcoin.invalidAddress, {
        description: t.send.bitcoin.invalidAddressDesc.replace(
          "{prefix}",
          btcNetwork === "mainnet" ? "bc1q" : "tb1q",
        ),
      });
    }

    let amountSats: bigint;
    try {
      amountSats = parseBitcoin(amountInput);
    } catch {
      // On n'affiche PAS err.message brut (peut varier avec lib/bitcoin).
      return toast.error(t.send.bitcoin.invalidAmount);
    }
    if (amountSats <= 0n) {
      return toast.error(t.send.bitcoin.amountPositive);
    }

    if (balance && amountSats > balance.amount) {
      return toast.error(t.send.bitcoin.insufficientBalance, {
        description: t.send.bitcoin.balanceDesc.replace(
          "{value}",
          formatBitcoin(balance.amount),
        ),
      });
    }

    if (effectiveRate === null) {
      return toast.error(t.send.bitcoin.feeMissing);
    }

    try {
      const { txId } = await send.mutateAsync({
        to: toTrimmed as Address,
        amountSats,
        feeRate: effectiveRate,
      });
      setLastTxId(txId);
      setTo("");
      setAmountInput("");
      setCustomRate("");
    } catch {
      /* toast déclenché par onError du hook */
    }
  }

  return (
    <SendShell
      assetId="btc"
      networkId={networkId}
      title={`${t.send.button} BTC`}
      subtitle={network?.name ?? networkId}
      balanceCard={
        <SendBalanceCard assetId="btc" balance={balanceDisplay} symbol="BTC" />
      }
    >
      {lastTxId && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">
            {t.send.bitcoin.txSent}
          </p>
          <p className="mt-1 font-mono break-all text-muted-foreground">
            {lastTxId}
          </p>
          <a
            href={`https://mempool.space/${btcNetwork === "testnet" ? "testnet/" : ""}tx/${lastTxId}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t.send.bitcoin.viewExplorer}
          </a>
        </div>
      )}

      <MainnetWarning networkId={networkId} className="mt-4" />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <SendField label={t.send.recipient}>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={recipientPlaceholder}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3.5 font-mono text-xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </SendField>
        {toTrimmed && !toValid && (
          <p className="text-[11px] text-destructive">
            {t.send.bitcoin.invalidAddress}
          </p>
        )}

        <SendField label={t.send.bitcoin.amountLabel}>
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder={t.send.bitcoin.amountPlaceholder}
            className="flex h-12 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </SendField>

        <fieldset className="rounded-xl border bg-card p-3">
          <legend className="px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t.send.bitcoin.priorityLabel}
          </legend>

          {feeLoading ? (
            <p className="text-xs text-muted-foreground">
              {t.send.bitcoin.loading}
            </p>
          ) : (
            <div className="space-y-1.5">
              {feeRates && (
                <>
                  <FeeRadio
                    value="fast"
                    current={priority}
                    onChange={setPriority}
                    label={t.send.bitcoin.feeFast}
                    rate={feeRates.fast}
                  />
                  <FeeRadio
                    value="normal"
                    current={priority}
                    onChange={setPriority}
                    label={t.send.bitcoin.feeNormal}
                    rate={feeRates.normal}
                  />
                  <FeeRadio
                    value="slow"
                    current={priority}
                    onChange={setPriority}
                    label={t.send.bitcoin.feeSlow}
                    rate={feeRates.slow}
                  />
                </>
              )}
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  id="fee-custom"
                  name="fee-priority"
                  checked={priority === "custom"}
                  onChange={() => setPriority("custom")}
                />
                <label htmlFor="fee-custom" className="cursor-pointer">
                  {t.send.bitcoin.feeCustom}
                </label>
                {priority === "custom" && (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder="8"
                    className="ml-auto w-20 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
                {priority === "custom" && (
                  <span className="text-[10px] text-muted-foreground">
                    {t.send.bitcoin.satPerVb}
                  </span>
                )}
              </div>
            </div>
          )}
        </fieldset>

        {estimatedFeeSats !== null && (
          <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>{t.send.bitcoin.feeEstimateLabel}</span>
              <span className="font-mono">
                ≈ {formatBitcoin(estimatedFeeSats)} BTC
              </span>
            </div>
            <p className="mt-1 text-[10px]">
              {t.send.bitcoin.feeEstimateHint}
            </p>
          </div>
        )}

        <SendSubmit
          label={`${t.send.button} BTC`}
          pending={send.isPending}
          pendingLabel={t.send.bitcoin.pending}
          icon={<Send className="size-4" />}
          assetId="btc"
        />
      </form>
    </SendShell>
  );
}

interface FeeRadioProps {
  readonly value: FeePriority;
  readonly current: FeePriority;
  readonly onChange: (v: FeePriority) => void;
  readonly label: string;
  readonly rate: bigint;
}

function FeeRadio({ value, current, onChange, label, rate }: FeeRadioProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <input
        type="radio"
        id={`fee-${value}`}
        name="fee-priority"
        checked={current === value}
        onChange={() => onChange(value)}
      />
      <label htmlFor={`fee-${value}`} className="cursor-pointer flex-1">
        {label}
      </label>
      <span className="font-mono text-[10px] text-muted-foreground">
        {rate.toString()} sat/vB
      </span>
    </div>
  );
}