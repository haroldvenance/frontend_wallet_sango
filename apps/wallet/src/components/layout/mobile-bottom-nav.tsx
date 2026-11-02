import {
  ArrowUpFromLine,
  Clock,
  ExternalLink,
  Home,
  Layers,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";
import { EXPLORER_URL } from "@/lib/config";
import { SHOW_STAKING } from "@/lib/env-flags";

/**
 * Valide qu'un lien externe peut être exposé à l'utilisateur.
 *
 * Rejette : HTTP, localhost, IPv4 loopback, IPv6 loopback, plages
 * IP privées (10.x, 172.16-31.x, 192.168.x), .local.
 */
function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "[::1]" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return false;
    }
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  end: boolean;
};

export function MobileBottomNav() {
  const t = useTranslation();
  const family = useWalletStore((s) => s.family);

  const showStaking = SHOW_STAKING && family === "sango";
  const explorerSafe = isSafeExternalUrl(EXPLORER_URL);

  const primary: NavItem[] = [
    { to: "/", label: t.nav.mobile.home, icon: Home, end: true },
    { to: "/history", label: t.nav.mobile.history, icon: Clock, end: false },
    { to: "/send", label: t.nav.mobile.send, icon: ArrowUpFromLine, end: false },
  ];
  const staking: NavItem = {
    to: "/validators",
    label: t.nav.mobile.staking,
    icon: Layers,
    end: false,
  };
  const settings: NavItem = {
    to: "/settings",
    label: t.nav.mobile.settings,
    icon: Settings,
    end: false,
  };

  const items: NavItem[] = showStaking
    ? [...primary, staking, settings]
    : [...primary, settings];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span
                    className={[
                      "text-[10px] leading-none",
                      isActive ? "font-semibold" : "font-medium",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}

        {!showStaking && explorerSafe && (
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-5" strokeWidth={2} />
            <span className="text-[10px] font-medium leading-none">
              {t.nav.mobile.explorer}
            </span>
          </a>
        )}
      </div>
    </nav>
  );
}