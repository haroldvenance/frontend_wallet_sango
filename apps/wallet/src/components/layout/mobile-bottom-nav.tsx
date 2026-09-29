import { ArrowLeftRight, Clock, LayoutDashboard, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";

/**
 * Barre de navigation mobile — visible uniquement sur < 1024px (lg:).
 *
 * 4 items principaux alignés sur la zone du pouce, avec un indicateur
 * visuel d'état actif (couleur + épaisseur d'icône).
 *
 * Le padding-bottom utilise `env(safe-area-inset-bottom)` pour éviter
 * d'être masqué par la barre gestuelle iOS.
 */
export function MobileBottomNav() {
  const t = useTranslation();

  const items = [
    { to: "/", label: t.nav.dashboard, icon: LayoutDashboard, end: true },
    { to: "/send", label: t.nav.send, icon: ArrowLeftRight, end: false },
    { to: "/history", label: t.nav.history, icon: Clock, end: false },
    { to: "/validators", label: t.nav.validators, icon: ShieldCheck, end: false },
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
                  <Icon
                    className="size-5"
                    strokeWidth={isActive ? 2.5 : 2}
                  />
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
