import { Keyring } from "@sango/wallet-core";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  Info,
  Link as LinkIcon,
  Lock,
  LogOut,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { SettingsModal } from "@/components/settings/settings-modal";
import { useTranslation } from "@/i18n/use-translation";
import { useLocaleStore } from "@/stores/locale-store";
import {
  AUTO_LOCK_OPTIONS_MS,
  usePreferencesStore,
} from "@/stores/preferences-store";
import { useThemeStore } from "@/stores/theme-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page Paramètres — Phase 1 (E2.5.d) + fixes E2.5.e.
 *
 * Sections :
 *   - Card wallet (label + badge Principal + Gérer)
 *   - SÉCURITÉ    : Phrase de récupération, Mot de passe, Verrouillage auto
 *   - RÉSEAUX     : Réseau par défaut, Approbations
 *   - PRÉFÉRENCES : Langue, Thème
 *   - SUPPORT     : Aide & à propos (v0.3)
 *   - Déconnexion
 *
 * Handlers (E2.5.e) :
 *   - Phrase de récupération → navigate `/settings/recovery-phrase`
 *   - Mot de passe          → toast "Bientôt disponible" (désactivé Phase 1)
 *   - Verrouillage auto     → picker inline 5/15/30/60 min
 *
 * **D-E2.5.d-2** — Déconnexion = `lock()` + navigate `/welcome`.
 * Le keyring reste intact.
 */
export function SettingsRoute() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lock, activeId, networkId } = useWalletStore();
  const { locale, toggle: toggleLocale } = useLocaleStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const autoLockMs = usePreferencesStore((s) => s.autoLockMs);
  const setAutoLockMs = usePreferencesStore((s) => s.setAutoLockMs);

  const [keyfileOpen, setKeyfileOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [autoLockExpanded, setAutoLockExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeId) {
        if (!cancelled) setActiveLabel(null);
        return;
      }
      try {
        const kr = await Keyring.open();
        const entry = await kr.get(activeId);
        kr.close();
        if (!cancelled) setActiveLabel(entry?.label ?? null);
      } catch {
        if (!cancelled) setActiveLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  function onLogout() {
    lock();
    navigate("/welcome");
  }

  function onPasswordClick() {
    toast.info(t.settings.password.comingSoon);
  }

  const localeLabel =
    locale === "fr"
      ? t.settings.languageValues.fr
      : t.settings.languageValues.en;

  const themeLabel =
    theme === "dark"
      ? t.settings.themeValues.dark
      : t.settings.themeValues.light;

  const autoLockLabel = formatAutoLockLabel(autoLockMs, t);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t.settings.title}
      </h1>

      {/* Wallet card */}
      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            W
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">
                {activeLabel ?? t.settings.wallet.fallbackLabel}
              </p>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {t.settings.wallet.active}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t.settings.wallet.accountCount.replace("{n}", "1")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setKeyfileOpen(true)}
            className="shrink-0 text-xs font-semibold text-primary transition-colors hover:underline"
          >
            {t.settings.wallet.manage}
          </button>
        </div>
      </div>

      {/* Sections */}
      <SettingsSection title={t.settings.sections.security}>
        <SettingRow
          icon={<ShieldCheck className="size-4" />}
          label={t.settings.items.recoveryPhrase}
          onClick={() => navigate("/settings/recovery-phrase")}
        />
        <SettingRow
          icon={<Lock className="size-4" />}
          label={t.settings.items.password}
          onClick={onPasswordClick}
        />

        {/* Auto-lock : picker inline */}
        <SettingRow
          icon={<Clock className="size-4" />}
          label={t.settings.autoLock.title}
          value={autoLockExpanded ? undefined : autoLockLabel}
          onClick={() => setAutoLockExpanded((v) => !v)}
        />
        {autoLockExpanded && (
          <div className="border-b bg-muted/20 px-4 py-3 last:border-b-0">
            <p className="mb-2 text-[11px] text-muted-foreground">
              {t.settings.autoLock.help}
            </p>
            <div className="space-y-1">
              {AUTO_LOCK_OPTIONS_MS.map((ms) => {
                const isActive = ms === autoLockMs;
                return (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => {
                      setAutoLockMs(ms);
                      setAutoLockExpanded(false);
                    }}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent",
                    ].join(" ")}
                  >
                    <span>{formatAutoLockLabel(ms, t)}</span>
                    {isActive && <CheckCircle2 className="size-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title={t.settings.sections.networks}>
        <SettingRow
          icon={<LinkIcon className="size-4" />}
          label={t.settings.items.defaultNetwork}
          value={networkId}
        />
        <SettingRow
          icon={<CheckCircle2 className="size-4" />}
          label={t.settings.items.approvals}
          onClick={() => navigate("/approvals")}
        />
      </SettingsSection>

      <SettingsSection title={t.settings.sections.preferences}>
        <SettingRow
          icon={<Globe className="size-4" />}
          label={t.settings.items.language}
          value={localeLabel}
          onClick={toggleLocale}
        />
        <SettingRow
          icon={<Moon className="size-4" />}
          label={t.settings.items.theme}
          value={themeLabel}
          onClick={toggleTheme}
        />
      </SettingsSection>

      <SettingsSection title={t.settings.sections.support}>
        <SettingRow
          icon={<Info className="size-4" />}
          label={t.settings.items.about}
          value={t.settings.version}
        />
      </SettingsSection>

      <button
        type="button"
        onClick={onLogout}
        className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="size-4" />
        {t.settings.logout}
      </button>

      <SettingsModal
        open={keyfileOpen}
        onClose={() => setKeyfileOpen(false)}
        initialTab="wallet"
      />
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Résout le libellé d'un `autoLockMs` selon les clés i18n.
 *
 * Les valeurs sont figées (5/15/30/60 min) donc un switch est plus
 * lisible qu'un calcul `ms / 60000` + interpolation.
 */
function formatAutoLockLabel(
  ms: number,
  t: ReturnType<typeof useTranslation>,
): string {
  switch (ms) {
    case 5 * 60 * 1000:
      return t.settings.autoLock.m5;
    case 15 * 60 * 1000:
      return t.settings.autoLock.m15;
    case 30 * 60 * 1000:
      return t.settings.autoLock.m30;
    case 60 * 60 * 1000:
      return t.settings.autoLock.m60;
    default:
      return `${Math.round(ms / 60000)} min`;
  }
}

function SettingsSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {children}
      </div>
    </section>
  );
}

interface SettingRowProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value?: string;
  readonly onClick?: () => void;
}

function SettingRow({ icon, label, value, onClick }: SettingRowProps) {
  const content = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {label}
      </span>
      {value && (
        <span className="shrink-0 text-xs text-muted-foreground">{value}</span>
      )}
      {onClick && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-accent/40"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 border-b px-4 py-3.5 last:border-b-0">
      {content}
    </div>
  );
}
