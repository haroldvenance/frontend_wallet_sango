import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";

const activities = [
  {
    type: "received",
    title: "Received SANGO",
    description: "From sango1k3...8m2q",
    amount: "+250.0000000 SANGO",
    time: "Today, 09:42",
    icon: ArrowDownLeft,
    iconClass: "bg-emerald-500/10 text-emerald-500",
    amountClass: "text-emerald-500",
  },
  {
    type: "sent",
    title: "Sent SANGO",
    description: "To sango1p8...4x7k",
    amount: "-75.5000000 SANGO",
    time: "Yesterday, 18:21",
    icon: ArrowUpRight,
    iconClass: "bg-primary/10 text-primary",
    amountClass: "text-foreground",
  },
  {
    type: "staked",
    title: "SANGO Staked",
    description: "Validator delegation",
    amount: "-500.0000000 SANGO",
    time: "Sep 23, 14:08",
    icon: ShieldCheck,
    iconClass: "bg-primary/10 text-primary",
    amountClass: "text-foreground",
  },
  {
    type: "pending",
    title: "Transaction pending",
    description: "Network confirmation",
    amount: "-25.0000000 SANGO",
    time: "Sep 22, 11:35",
    icon: Clock3,
    iconClass: "bg-amber-500/10 text-amber-500",
    amountClass: "text-muted-foreground",
  },
];

export function RecentActivity() {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Recent activity</h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Your latest wallet transactions
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          View all
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {activities.map((activity, index) => {
          const Icon = activity.icon;

          return (
            <div
              key={`${activity.type}-${activity.time}`}
              className={[
                "flex items-center gap-3 p-4 sm:p-5",
                index !== activities.length - 1 ? "border-b" : "",
              ].join(" ")}
            >
              <div
                className={[
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  activity.iconClass,
                ].join(" ")}
              >
                <Icon className="size-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {activity.title}
                </p>

                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {activity.description}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={[
                    "font-mono text-xs font-medium sm:text-sm",
                    activity.amountClass,
                  ].join(" ")}
                >
                  {activity.amount}
                </p>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Demo activity — transaction history will come from Sango RPC.
      </p>
    </section>
  );
}