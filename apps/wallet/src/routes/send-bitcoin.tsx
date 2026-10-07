import { bitcoinNetworkById } from "@sango/wallet-chains";
import type { Address } from "@sango/wallet-chains";
import type { BitcoinNetwork } from "@sango/wallet-core";
import { ArrowLeft, Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { MainnetWarning } from "@/features/evm/mainnet-warning";
import { useBitcoinBalance } from "@/hooks/use-bitcoin-balance";
import { useBitcoinFeeRates } from "@/hooks/use-bitcoin-fee-rates";
import { useSendBitcoin } from "@/hooks/use-send-bitcoin";
import { useWalletStore } from "@/stores/wallet-store";
import {
  formatBitcoin,
  isValidBitcoinAddress,
  parseBitcoin,
} from "@/lib/bitcoin";

type FeePriority = "fast" | "normal" | "slow" | "custom";

/**
 * Envoi Bitcoin natif — E2.1.b.6.3.
 *
 * Formulaire : destinataire + montant (BTC) + priorité de frais
 * (Rapide/Normal/Lent/Personnalisé). Le `feeRate` résultant est
 * passé au builder via `useSendBitcoin`.
 *
 * L'estimation des frais affichée est une **approximation UI** :
 * `feeRate × 140 vB` (1 input, 2 outputs P2WPKH — cas standard).
 * L'estimation finale dépend du nombre d'UTXOs sélectionnés — c'est
 * le builder qui la calcule au moment du send.
 */
export function SendBitcoinRoute() {
  const networkId = useWalletStore((s) => s.networkId);
  const network = bitcoinNetworkById(networkId);
  const btcNetwork: BitcoinNetwork =
    networkId === "bitcoin-mainnet" ? "mainnet" : "testnet";

  const { data: balance } = useBitcoinBalance();
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

  // Estimation rapide : 1 input, 2 outputs P2WPKH.
  const estimatedVsize = 140n;
  const estimatedFeeSats = effectiveRate
    ? effectiveRate * estimatedVsize
    : null;

  const toTrimmed = to.trim();
  const toValid = toTrimmed
    ? isValidBitcoinAddress(toTrimmed, btcNetwork)
    : false;

  const balanceDisplay = balance ? formatBitcoin(balance.amount) : "—";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!toValid) {
      return toast.error("Adresse invalide", {
        description: `Format attendu : adresse P2WPKH ${btcNetwork === "mainnet" ? "bc1q…" : "tb1q…"}`,
      });
    }

    let amountSats: bigint;
    try {
      amountSats = parseBitcoin(amountInput);
    } catch (err) {
      return toast.error("Montant invalide", {
        description: (err as Error).message,
      });
    }
    if (amountSats <= 0n) {
      return toast.error("Le montant doit être supérieur à 0");
    }

    if (balance && amountSats > balance.amount) {
      return toast.error("Solde insuffisant", {
        description: `Solde : ${formatBitcoin(balance.amount)} BTC`,
      });
    }

    if (effectiveRate === null) {
      return toast.error("Taux de frais manquant");
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
      // toast déjà déclenché par onError du hook
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour au tableau de bord
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">Envoyer</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Réseau : {network?.name ?? networkId}
      </p>

      <p className="mt-3 text-xs text-muted-foreground">
        Solde : {balanceDisplay} BTC
      </p>

      {lastTxId && (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">
            Transaction envoyée
          </p>
          <p className="mt-1 font-mono break-all text-muted-foreground">
            {lastTxId}
          </p>
          <a
            href={`https://mempool.space/${btcNetwork === "testnet" ? "testnet/" : ""}tx/${lastTxId}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline"
          >
            Voir sur mempool.space ↗
          </a>
        </div>
      )}

      <MainnetWarning networkId={networkId} className="mt-4" />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium">Destinataire</span>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={btcNetwork === "mainnet" ? "bc1q…" : "tb1q…"}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {toTrimmed && !toValid && (
            <p className="mt-1 text-[11px] text-destructive">
              Adresse P2WPKH invalide pour ce réseau.
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-medium">Montant (BTC)</span>
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0.001"
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <fieldset className="rounded-xl border bg-card p-3">
          <legend className="px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Priorité
          </legend>

          {feeLoading ? (
            <p className="text-xs text-muted-foreground">Chargement…</p>
          ) : (
            <div className="space-y-1.5">
              {feeRates && (
                <>
                  <FeeRadio
                    value="fast"
                    current={priority}
                    onChange={setPriority}
                    label="Rapide"
                    rate={feeRates.fast}
                  />
                  <FeeRadio
                    value="normal"
                    current={priority}
                    onChange={setPriority}
                    label="Normal"
                    rate={feeRates.normal}
                  />
                  <FeeRadio
                    value="slow"
                    current={priority}
                    onChange={setPriority}
                    label="Lent"
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
                  Personnalisé
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
                    sat/vB
                  </span>
                )}
              </div>
            </div>
          )}
        </fieldset>

        {estimatedFeeSats !== null && (
          <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Frais estimés</span>
              <span className="font-mono">
                ≈ {estimatedFeeSats.toString()} sats
              </span>
            </div>
            <p className="mt-1 text-[10px]">
              L&apos;estimation finale dépend des UTXOs sélectionnés.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={send.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-4" />
          {send.isPending ? "Envoi…" : "Envoyer BTC"}
        </button>
      </form>
    </div>
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
