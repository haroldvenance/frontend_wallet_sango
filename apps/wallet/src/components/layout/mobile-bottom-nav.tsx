import {
  ArrowUpFromLine,
  Clock,
  Home,
  Layers,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Barre de navigation mobile — visible uniquement sur < 1024px (lg:).
 *
 * 4 items (Phase 1, E2.5.d) :
 *   Accueil      → /
 *   Activité     → /history
 *   Staking      → /validators (SANGO uniquement)
 *   Paramètres   → /settings
 *
 * Pour les wallets non-SANGO, "Staking" est remplacé par "Envoyer"
 * (/send) car le concept de staking n'existe que sur SANGO.
 *
 * Le padding-bottom utilise `env(safe-area-inset-bottom)` pour éviter
 * d'être masqué par la barre gestuelle iOS.
 */
export function MobileBottomNav() {
  const t = useTranslation();
  const isSango = useWalletStore((s) => s.family === "sango");

  const items = isSango
    ? [
        { to: "/", label: t.nav.mobile.home, icon: Home, end: true },
        { to: "/history", label: t.nav.mobile.activity, icon: Clock, end: false },
        { to: "/validators", label: t.nav.mobile.staking, icon: Layers, end: false },
        { to: "/settings", label: t.nav.mobile.settings, icon: Settings, end: false },
      ]
    : [
        { to: "/", label: t.nav.mobile.home, icon: Home, end: true },
        { to: "/history", label: t.nav.mobile.activity, icon: Clock, end: false },
        { to: "/send", label: t.nav.send, icon: ArrowUpFromLine, end: false },
        { to: "/settings", label: t.nav.mobile.settings, icon: Settings, end: false },
      ];

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
      </div>
    </nav>
  );
}
