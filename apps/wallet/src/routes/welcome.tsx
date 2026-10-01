import { ArrowRight, KeyRound, Plus, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthShell } from "@/components/branding/auth-shell";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Page d'accueil — choix du wallet.
 *
 * Deux familles proposées :
 *  - SANGO (legacy Ed25519) : la voie principale.
 *  - EVM (BIP-39 secp256k1, Ethereum Sepolia) : nouvelle en E1, marquée
 *    comme "testnet" pour clarifier le périmètre.
 *
 * Les labels EVM sont en français hardcodé — les clés i18n
 * (`welcome.createEvm`, etc.) seront ajoutées en E1.5 quand le support
 * UI multi-chaîne sera complet.
 */
export function Welcome() {
  const t = useTranslation();

  const sangoOptions = [
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

  const evmOptions = [
    {
      to: "/create-evm",
      icon: Plus,
      title: "Créer un wallet Ethereum",
      desc: "BIP-39 · Sepolia (testnet)",
      iconCls: "bg-indigo-500/10 text-indigo-500",
    },
    {
      to: "/import-evm",
      icon: Upload,
      title: "Importer un wallet Ethereum",
      desc: "Phrase de récupération BIP-39",
      iconCls: "bg-violet-500/10 text-violet-500",
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
        {sangoOptions.map((opt) => {
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

      {/* ── Section EVM (E1) ── */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Ethereum · Sepolia
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <nav className="space-y-3">
          {evmOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link
                key={opt.to}
                to={opt.to}
                className="group flex items-center gap-4 rounded-2xl border border-dashed bg-card/60 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-md"
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
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </Link>
            );
          })}
        </nav>
      </div>
    </AuthShell>
  );
}
