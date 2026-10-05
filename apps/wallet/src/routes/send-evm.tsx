import type { Address, Token } from "@sango/wallet-chains";
import { evmNetworkById } from "@sango/wallet-chains";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ExplorerLinkEvm } from "@/features/evm/explorer-link-evm";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { useEvmTokens } from "@/hooks/use-evm-tokens";
import { useSendEvm } from "@/hooks/use-send-evm";
import {
  formatNativeShort,
  formatStablecoinUsd,
  formatTokenAmount,
  isValidEvmAddress,
  parseEth,
  parseTokenAmount,
} from "@/lib/eth";
import { useNetworkQueryContext } from "@/hooks/use-network-query-context";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Envoi d'un actif EVM — ETH natif ou token ERC-20 (E1.6.a.5).
 *
 * Le sélecteur de token liste :
 *   - ETH (toujours présent, gas token)
 *   - USDC / USDT (si configurés pour le réseau courant)
 *
 * Selon le token sélectionné :
 *   - validation : solde du token (pas ETH)
 *   - frais     : en ETH dans tous les cas (gas token)
 *   - MAX       : solde du token (ou ETH − 0.0001 pour réserve de frais)
 */
export function SendEvmRoute() {
  const session = useWalletSession();
  const networkId = useWalletStore((s) => s.networkId);
  const { account } = useNetworkQueryContext();
  const { data: evmAccount } = useEvmAccount();
  const { data: tokensWithBalance } = useEvmTokens();
  const sendEvm = useSendEvm();

  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;

  // Liste des tokens disponibles (ETH en premier, puis tokens configurés).
  const availableTokens = useMemo(
    () => (tokensWithBalance ?? []).map((t) => t.token),
    [tokensWithBalance],
  );

  // Token sélectionné : "eth" (string sentinel) ou contrat du token.
  const [selected, setSelected] = useState<string>("eth");
  const selectedToken: Token | undefined = availableTokens.find(
    (t) => t.contract === selected,
  );

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [feeHint, setFeeHint] = useState<{
    gasLimit: bigint;
    maxFeePerGas: bigint;
    totalWei: bigint;
  } | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Le solde du token sélectionné (ETH si selected === "eth").
  const selectedBalance: bigint | null = (() => {
    if (selected === "eth") return evmAccount?.balance ?? null;
    const entry = tokensWithBalance?.find((t) => t.token.contract === selected);
    return entry?.balance ?? null;
  })();

  // Estimation des frais (natif ou ERC-20).
  useEffect(() => {
    if (!session || !to || !amount) {
      setFeeHint(null);
      return;
    }
    if (!isValidEvmAddress(to)) {
      setFeeHint(null);
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
      setFeeHint(null);
      return;
    }

    const assetRef = selectedToken
      ? ({
          kind: "token",
          networkId,
          contract: selectedToken.contract,
        } as const)
      : ({ kind: "native", assetId: "eth", networkId } as const);

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
        if (cancelled) return;
        const b = est.breakdown ?? {};
        setFeeHint({
          gasLimit: (b.gasLimit as bigint) ?? 21_000n,
          maxFeePerGas: (b.maxFeePerGas as bigint) ?? 0n,
          totalWei: est.total,
        });
      })
      .catch(() => {
        if (!cancelled) setFeeHint(null);
      })
      .finally(() => {
        if (!cancelled) setFeeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, to, amount, networkId, account, selectedToken]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!isValidEvmAddress(to)) {
      return toast.error("Adresse invalide", {
        description: "Format attendu : 0x suivi de 40 caractères hexadécimaux.",
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
    } catch (err) {
      return toast.error("Montant invalide", {
        description: (err as Error).message,
      });
    }

    if (amountBaseUnits <= 0n) {
      return toast.error("Le montant doit être supérieur à 0");
    }

    // Vérification du solde du token sélectionné.
    if (selectedBalance !== null && amountBaseUnits > selectedBalance) {
      const symbol = selectedToken?.metadata.symbol ?? "ETH";
      const displayed = selectedToken
        ? formatTokenAmount(selectedBalance, selectedToken.metadata.decimals)
        : formatNativeShort(selectedBalance);
      return toast.error("Solde insuffisant", {
        description: `Solde : ${displayed} ${symbol}`,
      });
    }

    // Vérification du solde ETH pour les frais (gas token).
    if (evmAccount && feeHint && evmAccount.balance < feeHint.totalWei) {
      return toast.error("Solde ETH insuffisant pour les frais", {
        description: `Frais estimés : ${formatNativeShort(feeHint.totalWei)} ETH`,
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
      setFeeHint(null);
    } catch {
      // toast déjà déclenché par onError du hook
    }
  }

  const symbol = selectedToken?.metadata.symbol ?? "ETH";
  const balanceDisplay =
    selectedBalance !== null
      ? selectedToken
        ? formatTokenAmount(selectedBalance, selectedToken.metadata.decimals)
        : formatNativeShort(selectedBalance)
      : null;

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour au tableau de bord
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        Envoyer
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">Réseau : {networkName}</p>

      {balanceDisplay !== null && (
        <p className="mt-3 text-xs text-muted-foreground">
          Solde : {balanceDisplay} {symbol}
        </p>
      )}

      {lastTxHash && (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">
            Transaction envoyée
          </p>
          <p className="mt-1 font-mono break-all text-muted-foreground">
            {lastTxHash}
          </p>
          <div className="mt-2">
            <ExplorerLinkEvm hash={lastTxHash} />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium">Actif</span>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setAmount("");
              setFeeHint(null);
            }}
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="eth">ETH — natif</option>
            {availableTokens.map((t) => (
              <option key={t.contract} value={t.contract}>
                {t.metadata.symbol} — {t.metadata.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium">Destinataire</span>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium">Montant ({symbol})</span>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={selectedToken ? "1.00" : "0.01"}
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 pr-16 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {selectedBalance !== null && selectedBalance > 0n && (
              <button
                type="button"
                onClick={() => {
                  if (selectedToken) {
                    // Token : MAX = solde complet
                    setAmount(
                      formatTokenAmount(
                        selectedBalance,
                        selectedToken.metadata.decimals,
                      ),
                    );
                  } else {
                    // ETH : MAX = solde − 0.0001 ETH (réserve gas)
                    const reserve = 10n ** 14n; // 0.0001 ETH
                    const max = selectedBalance > reserve
                      ? selectedBalance - reserve
                      : 0n;
                    setAmount(formatNativeShort(max));
                  }
                }}
                className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded-lg border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent"
              >
                MAX
              </button>
            )}
          </div>
          {selectedToken && amount && (
            <p className="mt-1.5 text-xs text-muted-foreground">
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
        </label>

        {feeHint && (
          <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Gas estimé</span>
              <span className="font-mono">{feeHint.gasLimit.toString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Max fee / gas</span>
              <span className="font-mono">
                {formatNativeShort(feeHint.maxFeePerGas)} ETH
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1 font-medium text-foreground">
              <span>Frais max</span>
              <span className="font-mono">
                {formatNativeShort(feeHint.totalWei)} ETH
              </span>
            </div>
          </div>
        )}
        {feeLoading && !feeHint && (
          <p className="text-[11px] text-muted-foreground">Estimation des frais…</p>
        )}

        <button
          type="submit"
          disabled={sendEvm.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-4" />
          {sendEvm.isPending ? "Envoi…" : `Envoyer ${symbol}`}
        </button>
      </form>
    </div>
  );
}
