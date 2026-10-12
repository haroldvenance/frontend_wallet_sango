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

/**
 * Barre de navigation mobile — visible uniquement sur < 1024px (lg:).
 *
 * **Phase 5.7** — passage à 5 items :
 *   Accueil      → /
 *   Historique   → /history    (renommé depuis "Activité")
 *   Staking / Envoyer  → /validators (SANGO) · /send (autres)
 *   Paramètres   → /settings
 *   Explorer     → lien externe (EXPLORER_URL)
 *
 * "Activité" a été renommé "Historique" pour cohérence avec la
 * sidebar desktop. "Explorer" ouvre l'explorer dans un nouvel onglet.
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
        {
          to: "/history",
          label: t.nav.mobile.history,
          icon: Clock,
          end: false,
        },
        {
          to: "/validators",
          label: t.nav.mobile.staking,
          icon: Layers,
          end: false,
        },
        {
          to: "/settings",
          label: t.nav.mobile.settings,
          icon: Settings,
          end: false,
        },
      ]
    : [
        { to: "/", label: t.nav.mobile.home, icon: Home, end: true },
        {
          to: "/history",
          label: t.nav.mobile.history,
          icon: Clock,
          end: false,
        },
        {
          to: "/send",
          label: t.nav.mobile.send,
          icon: ArrowUpFromLine,
          end: false,
        },
        {
          to: "/settings",
          label: t.nav.mobile.settings,
          icon: Settings,
          end: false,
        },
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

        {/* Explorer — lien externe (pas de NavLink, pas d'état actif) */}
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
      </div>
    </nav>
  );
}
