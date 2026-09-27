import type { Tx } from "@sango/rpc";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import { useTransactions } from "@/hooks/use-transactions";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";
import { formatSango, shortenAddress } from "@/lib/format";

const TX_KIND = {
  Transfer: 0x01,
  Bond: 0x04,
  Unbond: 0x05,
  Delegate: 0x06,
  Undelegate: 0x07,
  ClaimRewards: 0x08,
  RegisterValidator: 0x09,
  UpdateCommission: 0x0a,
  Unjail: 0x0b,
} as const;

function txDirection(tx: Tx, selfAddress: string): "in" | "out" | "stake" | "pending" {
  if (tx.blockHeight === null) return "pending";
  const isStaking = (
    [
      TX_KIND.Bond,
      TX_KIND.Unbond,
      TX_KIND.Delegate,
      TX_KIND.Undelegate,
      TX_KIND.ClaimRewards,
      TX_KIND.RegisterValidator,
      TX_KIND.UpdateCommission,
      TX_KIND.Unjail,
    ] as readonly number[]
  ).includes(tx.txKind);
  if (isStaking) return "stake";
  if (tx.sender.toLowerCase() === selfAddress.toLowerCase()) return "out";
  return "in";
}

function kindLabelKey(direction: string): string {
  if (direction === "in") return "received";
  if (direction === "out") return "sent";
  if (direction === "stake") return "staked";
  return "pending";
}

function iconFor(direction: string) {
  switch (direction) {
    case "in":
      return { Icon: ArrowDownLeft, cls: "bg-emerald-500/10 text-emerald-500" };
    case "out":
      return { Icon: ArrowUpRight, cls: "bg-primary/10 text-primary" };
    case "stake":
      return { Icon: ShieldCheck, cls: "bg-primary/10 text-primary" };
    default:
      return { Icon: Clock3, cls: "bg-amber-500/10 text-amber-500" };
  }
}

export function RecentActivity() {
  const t = useTranslation();
  const { wallet } = useWalletStore();
  const { data, isLoading, isError } = useTransactions({ limit: 5 });

  const items = data?.items ?? [];
  const self = wallet?.identity.addressHex ?? "";

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{t.activity.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.activity.subtitle}</p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {t.activity.viewAll}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {isLoading && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {t.common.loading}
          </div>
        )}

        {isError && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Historique bientôt disponible (backend P3.2.c)
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Aucune transaction
          </div>
        )}

        {items.map((tx, index) => {
          const direction = txDirection(tx, self);
          const { Icon, cls } = iconFor(direction);
          const kindKey = kindLabelKey(direction) as
            | "received"
            | "sent"
            | "staked"
            | "pending";
          const amount = formatSango(tx.value);
          const sign = direction === "out" || direction === "stake" ? "-" : "+";
          const counterparty =
            direction === "out" ? tx.recipient : tx.sender;

          return (
            <div
              key={tx.hash}
              className={[
                "flex items-center gap-3 p-4 sm:p-5",
                index !== items.length - 1 ? "border-b" : "",
              ].join(" ")}
            >
              <div className={["flex size-10 shrink-0 items-center justify-center rounded-xl", cls].join(" ")}>
                <Icon className="size-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t.activity[kindKey]}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {counterparty
                    ? `${t.activity.from}: ${shortenAddress(counterparty, 5)}`
                    : `Block #${tx.blockHeight ?? "pending"}`}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-mono text-xs font-medium sm:text-sm">
                  {sign}
                  {amount} SANGO
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {tx.blockHeight !== null
                    ? `Block #${tx.blockHeight}`
                    : "Mempool"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
