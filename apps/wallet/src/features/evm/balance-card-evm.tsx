import { Bip39Wallet } from "@sango/wallet-core";
import { Copy } from "lucide-react";

import { useClipboard } from "@/hooks/use-clipboard";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { evmNetworkById } from "@sango/wallet-chains";

import { useWalletStore } from "@/stores/wallet-store";

/** Formate wei → ETH avec 6 décimales significatives. */
function formatEth(wei: bigint): string {
  const base = 10n ** 18n;
  const whole = wei / base;
  const frac = wei % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${fracStr}`.replace(/\.?0+$/, "");
}

function shortenAddress(a: string): string {
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

/**
 * Carte de solde pour un wallet EVM (BIP-39).
 *
 * Volontairement minimale (E1) :
 *   - adresse EVM (0x…, lowercase — pas d'EIP-55 pour l'instant)
 *   - solde ETH natif
 *   - nonce
 *
 * Pas de fiat, pas de faucet, pas de send (E1.5+).
 */
export function BalanceCardEvm() {
  const wallet = useWalletStore((s) => s.wallet);
  const networkId = useWalletStore((s) => s.networkId);
  const { data: account, isLoading } = useEvmAccount();
  const copy = useClipboard();

  const bip39Wallet = wallet instanceof Bip39Wallet ? wallet : null;
  const address = bip39Wallet?.defaultAddress ?? "—";
  const network = evmNetworkById(networkId);
  const networkName = network?.name ?? networkId;
  const isTestnet = networkId === "ethereum-sepolia";

  const balanceDisplay = account
    ? formatEth(account.balance)
    : isLoading
      ? "…"
      : "0";

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-lg font-semibold text-indigo-500">
              Ξ
            </div>
            <div>
              <p className="text-sm font-medium">Solde Ethereum</p>
              <p className="text-xs text-muted-foreground">
                {networkName}
                {isTestnet ? " · testnet" : ""}
              </p>
            </div>
          </div>

          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-500">
            BIP-39
          </span>
        </div>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Disponible
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {balanceDisplay}
            </span>
            <span className="text-sm font-medium text-muted-foreground">ETH</span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5">
            <span className="size-2 rounded-full bg-indigo-500" />
            <span className="font-mono text-xs text-muted-foreground">
              {shortenAddress(address)}
            </span>
            <button
              type="button"
              onClick={() => copy(address, "Adresse copiée")}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Copier l'adresse"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>

        {account && (
          <p className="mt-5 text-[11px] text-muted-foreground">
            Nonce : {account.nonce}
          </p>
        )}
      </div>
    </section>
  );
}
