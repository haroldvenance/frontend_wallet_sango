import {
  ArrowLeftRight,
  History,
  LayoutDashboard,
  ExternalLink,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { LocaleToggle } from "@/components/settings/locale-toggle";
import { NetworkSelector } from "@/components/settings/network-selector";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ErrorBoundary } from "@/components/error-boundary";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useChainInfo } from "@/hooks/use-chain-info";
import { useTranslation } from "@/i18n/use-translation";
import { shortenHash } from "@/lib/format";
import { EXPLORER_URL } from "@/lib/config";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: ReactNode;
}

function NetworkBadge() {
  const t = useTranslation();
  const { data, isError, isLoading } = useChainInfo();

  if (isLoading) {
    return (
      <div className="mt-3 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
          <span className="text-xs font-medium">{t.network.connecting}</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex items-center gap-2">
          <WifiOff className="size-3 text-destructive" />
          <span className="text-xs font-medium text-destructive">{t.network.offline}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
        <span className="text-xs font-medium">{t.network.sangoNetwork}</span>
      </div>
      <p className="mt-1 pl-4 text-[11px] text-muted-foreground">
        {t.network.height} {data.height ?? "—"} · v{data.protocolVersion}
      </p>
      <p className="mt-0.5 pl-4 font-mono text-[10px] text-muted-foreground">
        {shortenHash(data.chainId, 6)}
      </p>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const t = useTranslation();
  const [keyfileOpen, setKeyfileOpen] = useState(false);
  const { data, isError } = useChainInfo();

  const navigation = [
    { to: "/", label: t.nav.dashboard, icon: LayoutDashboard, end: true },
    { to: "/send", label: t.nav.send, icon: ArrowLeftRight, end: false },
    { to: "/history", label: t.nav.history, icon: History, end: false },
    { to: "/validators", label: t.nav.validators, icon: ShieldCheck, end: false },
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
          </nav>

          <div className="border-t p-3">
            <button
              type="button"
              onClick={() => setKeyfileOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="size-4" />
              {t.nav.settings}
            </button>
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="size-4" />
              Explorer
            </a>

            <div className="mt-3">
              <NetworkSelector />
            </div>
            <NetworkBadge />
          </div>
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
                      {data?.height != null ? `${t.network.height} ${data.height}` : t.network.online}
                    </span>
                  </>
                )}
              </div>
              <LocaleToggle />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setKeyfileOpen(true)}
                aria-label="Paramètres"
                className="inline-flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
              >
                <Settings className="size-4" />
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
            <ErrorBoundary scope="Route">{children}</ErrorBoundary>
          </main>
        </div>
      </div>

      <MobileBottomNav />

      <SettingsModal open={keyfileOpen} onClose={() => setKeyfileOpen(false)} />
    </div>
  );
}
