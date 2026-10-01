import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import { ActivitySection } from "@/components/ui/activity-section";
import { useTransactions } from "@/hooks/use-transactions";
import { useTranslation } from "@/i18n/use-translation";
import { useSangoWallet } from "@/hooks/use-sango-wallet";
import { formatSango, shortenAddress } from "@/lib/format";
import { classifyTx, displayAmount, txKindLabel, type TxDirection } from "@/lib/tx-classify";

function iconFor(direction: TxDirection) {
  switch (direction) {
    case "in":
      return { Icon: ArrowDownLeft, cls: "bg-emerald-500/10 text-emerald-500" };
    case "out":
      return { Icon: ArrowUpRight, cls: "bg-primary/10 text-primary" };
    case "neutral":
      return { Icon: ShieldCheck, cls: "bg-primary/10 text-primary" };
    default:
      return { Icon: Clock3, cls: "bg-amber-500/10 text-amber-500" };
  }
}

function labelForTx(
  tx: { txKind: number },
  direction: TxDirection,
  t: unknown,
): string {
  if (direction === "pending") return "En attente";
  if (tx.txKind === 0x01) {
    return direction === "in" ? "Transfert reçu" : "Transfert envoyé";
  }
  return txKindLabel(tx.txKind, t);
}

/**
 * Activité récente SANGO — wrapper de `ActivitySection`.
 */
export function RecentActivity() {
  const t = useTranslation();
  const wallet = useSangoWallet();
  const { data, isLoading, isError, refetch, isFetching } =
    useTransactions({ limit: 5 });

  const items = data?.items ?? [];
  const self = wallet?.identity.addressHex ?? "";

  return (
    <ActivitySection
      title={t.activity.title}
      subtitle={t.activity.subtitle}
      onRefresh={() => void refetch()}
      isRefreshing={isFetching}
    >
      {isLoading && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          {t.common.loading}
        </div>
      )}

      {isError && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Historique bientôt disponible
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Aucune transaction
        </div>
      )}

      {items.map((tx, index) => {
        const { direction, counterparty: cp, isStaking } = classifyTx(tx, self);
        const { Icon, cls } = iconFor(direction);
        const label = labelForTx(tx, direction, t);
        const value = displayAmount(tx.value);
        const amount = value === null ? "—" : formatSango(value);
        const sign = direction === "in" ? "+" : direction === "out" ? "-" : "";
        const counterparty = cp;
        void isStaking;

        const line = counterparty
          ? `${direction === "in" ? t.activity.from : t.activity.to}: ${shortenAddress(counterparty, 5)}`
          : `Block #${tx.blockHeight ?? "pending"}`;

        return (
          <div
            key={tx.hash}
            className={[
              "flex items-center gap-3 p-4 sm:p-5",
              index !== items.length - 1 ? "border-b" : "",
            ].join(" ")}
          >
            <div
              className={[
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                cls,
              ].join(" ")}
            >
              <Icon className="size-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {line}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-mono text-xs font-medium sm:text-sm">
                {amount === "—" ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>
                    <span
                      className={
                        direction === "in"
                          ? "text-emerald-500"
                          : direction === "out"
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }
                    >
                      {sign}
                      {amount}
                    </span>
                    <span className="ml-1 text-muted-foreground">SANGO</span>
                  </>
                )}
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
    </ActivitySection>
  );
}
