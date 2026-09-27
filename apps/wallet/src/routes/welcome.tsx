import { ArrowRight, KeyRound, Plus, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthShell } from "@/components/branding/auth-shell";
import { useTranslation } from "@/i18n/use-translation";

export function Welcome() {
  const t = useTranslation();

  const options = [
    {
      to: "/create",
      icon: Plus,
      title: t.welcome.create,
      desc: t.welcome.createDesc,
      iconCls: "bg-primary/10 text-primary",
    },
    {
      to: "/import",
      icon: Upload,
      title: t.welcome.import,
      desc: t.welcome.importDesc,
      iconCls: "bg-emerald-500/10 text-emerald-500",
    },
    {
      to: "/unlock",
      icon: KeyRound,
      title: t.welcome.restore,
      desc: t.welcome.restoreDesc,
      iconCls: "bg-amber-500/10 text-amber-500",
    },
  ];

  return (
    <AuthShell
      title={t.welcome.title}
      subtitle={t.welcome.subtitle}
      logoSize={84}
      footer={<span>Sango Wallet</span>}
    >
      <nav className="space-y-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <Link
              key={opt.to}
              to={opt.to}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div
                className={[
                  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                  opt.iconCls,
                ].join(" ")}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {opt.title}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {opt.desc}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </nav>
    </AuthShell>
  );
}
