import type { Address } from "@sango/wallet-chains";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ExplorerLinkEvm } from "@/features/evm/explorer-link-evm";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { useSendEvm } from "@/hooks/use-send-evm";
import { formatEthShort, isValidEvmAddress, parseEth } from "@/lib/eth";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "@/hooks/use-network-query-context";
import { evmNetworkById } from "@sango/wallet-chains";

/**
 * Envoi d'ETH natif (EIP-1559) sur le réseau du wallet actif.
 *
 * Symétrique de `/send` (SANGO). Passe par `WalletSession.send()`
 * qui orchestre build → sign → broadcast.
 *
 * Pas d'ERC-20 en 6.b. Pas de changement de réseau depuis cette page
 * (le réseau est figé à la création, D-UI-3).
 */
export function SendEvmRoute() {
  const session = useWalletSession();
  const networkId = useWalletStore((s) => s.networkId);
  const { account } = useNetworkQueryContext();
  const { data: evmAccount } = useEvmAccount();
  const sendEvm = useSendEvm();

  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [feeHint, setFeeHint] = useState<{
    gasLimit: bigint;
    maxFeePerGas: bigint;
    totalWei: bigint;
  } | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Estimation des frais dès que to + amount sont valides.
  useEffect(() => {
    if (!session || !to || !amount) {
      setFeeHint(null);
      return;
    }
    if (!isValidEvmAddress(to)) {
      setFeeHint(null);
      return;
    }
    let amountWei: bigint;
    try {
      amountWei = parseEth(amount);
    } catch {
      setFeeHint(null);
      return;
    }

    let cancelled = false;
    setFeeLoading(true);
    session
      .estimateFee(
        {
          from: to as Address, // sera remplacé par la session via account
          to: to as Address,
          assetRef: { kind: "native", assetId: "eth", networkId },
          amount: amountWei,
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
  }, [session, to, amount, networkId, account]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!isValidEvmAddress(to)) {
      return toast.error("Adresse invalide", {
        description: "Format attendu : 0x suivi de 40 caractères hexadécimaux.",
      });
    }
    let amountWei: bigint;
    try {
      amountWei = parseEth(amount);
    } catch (err) {
      return toast.error("Montant invalide", {
        description: (err as Error).message,
      });
    }
    if (amountWei <= 0n) {
      return toast.error("Le montant doit être supérieur à 0");
    }
    if (evmAccount && amountWei + (feeHint?.totalWei ?? 0n) > evmAccount.balance) {
      return toast.error("Solde insuffisant", {
        description: `Solde : ${formatEthShort(evmAccount.balance)} ETH`,
      });
    }

    try {
      const { txHash } = await sendEvm.mutateAsync({
        to: to as Address,
        amountWei,
      });
      setLastTxHash(txHash);
      // Reset le formulaire mais reste sur la page pour montrer le lien.
      setTo("");
      setAmount("");
      setFeeHint(null);
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

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        Envoyer de l&apos;ETH
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Réseau : {networkName}
      </p>

      {evmAccount && (
        <p className="mt-3 text-xs text-muted-foreground">
          Solde : {formatEthShort(evmAccount.balance)} ETH
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
          <span className="text-xs font-medium">Montant (ETH)</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.01"
            className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
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
                {formatEthShort(feeHint.maxFeePerGas)} ETH
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1 font-medium text-foreground">
              <span>Frais max</span>
              <span className="font-mono">
                {formatEthShort(feeHint.totalWei)} ETH
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
          {sendEvm.isPending ? "Envoi…" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
