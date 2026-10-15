import { ArrowDownLeft, Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";
import { formatTokenAmount } from "@/lib/format-token-amount";
import { truncateMiddle } from "@/lib/format";
import {
  selectUnreadCount,
  useIncomingNotificationStore,
  type NotificationSource,
} from "@/stores/incoming-notification-store";

/**
 * **Phase 12-D-A** — Cloche avec badge compteur et dropdown.
 *
 * **Règles** :
 *   - Badge affiché seulement si `unread > 0`. Plafonné à "99+".
 *   - Ouvrir le dropdown ne marque PAS tout comme lu.
 *   - "Tout marquer comme lu" est explicite.
 *   - "Voir tout" navigue vers `/history` et ferme le dropdown.
 *   - Click extérieur ferme le dropdown.
 */
const DROPDOWN_ITEMS = 8;

export function NotificationBell() {
  const t = useTranslation();
  const navigate = useNavigate();
  const entries = useIncomingNotificationStore((s) => s.entries);
  const unread = useIncomingNotificationStore(selectUnreadCount);
  const markAllRead = useIncomingNotificationStore((s) => s.markAllRead);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Click outside → close.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sorted = [...entries].sort((a, b) => b.detectedAt - a.detectedAt);
  const recent = sorted.slice(0, DROPDOWN_ITEMS);

  // **Phase 12-D-B** — groupe par famille (EVM / Bitcoin / Sango).
  // L'ordre est figé pour un rendu stable.
  const SOURCE_ORDER: readonly NotificationSource[] = [
    "evm",
    "bitcoin",
    "sango",
  ];
  const grouped = new Map<NotificationSource, typeof recent>();
  for (const e of recent) {
    const bucket = grouped.get(e.source);
    if (bucket) bucket.push(e);
    else grouped.set(e.source, [e]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="notification-bell"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.notificationBell.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span
            data-testid="notification-bell-badge"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          data-testid="notification-bell-dropdown"
          className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-2xl border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">
              {t.notificationBell.title}
            </p>
            {unread > 0 && (
              <button
                type="button"
                data-testid="notification-bell-mark-read"
                onClick={() => markAllRead()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <CheckCheck className="size-3" />
                {t.notificationBell.markAllRead}
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              {t.notificationBell.empty}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {SOURCE_ORDER.map((src) => {
                const items = grouped.get(src);
                if (!items || items.length === 0) return null;
                return (
                  <section
                    key={src}
                    data-testid={`notification-section-${src}`}
                  >
                    <p className="border-b bg-muted/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.notificationBell.sources[src]}
                    </p>
                    <ul>
                      {items.map((e) => (
                        <li
                          key={e.key}
                          className={[
                            "flex items-start gap-3 border-b px-4 py-3 last:border-b-0",
                            e.read ? "opacity-60" : "",
                          ].join(" ")}
                        >
                          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                            <ArrowDownLeft className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium">
                              +{formatTokenAmount(e.amount)} {e.symbol}
                            </p>
                            {e.counterparty && (
                              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                                {t.notificationBell.from}{" "}
                                {truncateMiddle(e.counterparty, 6, 4)}
                              </p>
                            )}
                          </div>
                          {!e.read && (
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          <button
            type="button"
            data-testid="notification-bell-view-all"
            onClick={() => {
              setOpen(false);
              navigate("/history");
            }}
            className="flex w-full items-center justify-center border-t px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
          >
            {t.notificationBell.viewAll}
          </button>
        </div>
      )}
    </div>
  );
}
