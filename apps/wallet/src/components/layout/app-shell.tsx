import {
  ArrowLeftRight,
  History,
  LayoutDashboard,
  ExternalLink,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { LocaleToggle } from "@/components/settings/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ErrorBoundary } from "@/components/error-boundary";
import { useChainInfo } from "@/hooks/use-chain-info";
import { useTranslation } from "@/i18n/use-translation";
import { EXPLORER_URL } from "@/lib/config";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Coquille applicative — Phase 5.7.
 *
 * **Changements Phase 5.7** :
 *   - Les sélecteurs de famille (SANGO/EVM/Bitcoin) et de réseau ont
 *     été **déplacés dans Paramètres** (`/settings`). La sidebar ne
 *     garde que la navigation.
 *   - "Validateurs" n'est plus dans le nav principal (SANGO-only, sans
 *     mainnet déployé). La route reste accessible via `/validators`
 *     si besoin.
 *
 * Navigation desktop (groupée en haut de la sidebar) :
 *   - Tableau de bord
 *   - Envoyer
 *   - Historique
 *   - Paramètres
 *   - Explorer (lien externe)
 */
export function AppShell({ children }: AppShellProps) {
  const t = useTranslation();
  const { data, isError } = useChainInfo();

  const navigation = [
    { to: "/", label: t.nav.dashboard, icon: LayoutDashboard, end: true },
    { to: "/send", label: t.nav.send, icon: ArrowLeftRight, end: false },
    { to: "/history", label: t.nav.history, icon: History, end: false },
  ];

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="flex min-h-svh">
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-5">
            <img
              src="/sango-logo.png"
              alt="Sango"
              className="size-9 rounded-xl shadow-sm"
              draggable={false}
            />
            <div>
              <p className="text-sm font-semibold tracking-tight">Sango</p>
              <p className="text-[11px] text-muted-foreground">Wallet</p>
            </div>
          </div>

          {/*
            Phase 5.7 — Tous les items sont groupés dans un seul
            `<nav>` (Tableau de bord, Envoyer, Historique, Paramètres,
            Explorer). Pas de séparation visuelle en bas.
          */}
          <nav className="flex-1 space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              );
            })}

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                [
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                ].join(" ")
              }
            >
              <Settings className="size-4" />
              {t.nav.settings}
            </NavLink>

            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="size-4" />
              {t.nav.explorer}
            </a>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src="/sango-logo.png"
                alt="Sango"
                className="size-9 rounded-xl shadow-sm"
                draggable={false}
              />
              <span className="text-sm font-semibold">Sango</span>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm font-medium">Sango Wallet</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
                {isError ? (
                  <>
                    <WifiOff className="size-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive">
                      {t.network.offline}
                    </span>
                  </>
                ) : (
                  <>
                    <Wifi className="size-3.5 text-emerald-500" />
                    <span className="text-xs font-medium">
                      {data?.height != null
                        ? `${t.network.height} ${data.height}`
                        : t.network.online}
                    </span>
                  </>
                )}
              </div>
              <LocaleToggle />
              <ThemeToggle />
              <NavLink
                to="/settings"
                aria-label={t.nav.settings}
                className="inline-flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
              >
                <Settings className="size-4" />
              </NavLink>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
            <ErrorBoundary scope="Route">{children}</ErrorBoundary>
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
