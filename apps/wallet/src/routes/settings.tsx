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

import { SettingsModal } from "@/components/settings/settings-modal";
import { useTranslation } from "@/i18n/use-translation";
import { useLocaleStore } from "@/stores/locale-store";
import { useThemeStore } from "@/stores/theme-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page Paramètres — Phase 1 (E2.5.d).
 *
 * Remplace la modale `SettingsModal` par une route pleine page.
 *
 * Sections :
 *   - Card wallet (label + badge Principal + Gérer)
 *   - SÉCURITÉ    : Phrase de récupération, Mot de passe, Verrouillage auto
 *   - RÉSEAUX     : Réseau par défaut, Approbations
 *   - PRÉFÉRENCES : Langue, Thème
 *   - SUPPORT     : Aide & à propos (v0.3)
 *   - Déconnexion
 *
 * **D-E2.5.d-2** — Déconnexion = `lock()` + navigate `/welcome`.
 * Le keyring reste intact, l'utilisateur peut se reconnecter.
 */
export function SettingsRoute() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lock, activeId, networkId } = useWalletStore();
  const { locale, toggle: toggleLocale } = useLocaleStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  const [keyfileOpen, setKeyfileOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  // Charge le label du wallet actif depuis le keyring
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

  const localeLabel =
    locale === "fr"
      ? t.settings.languageValues.fr
      : t.settings.languageValues.en;

  const themeLabel =
    theme === "dark"
      ? t.settings.themeValues.dark
      : t.settings.themeValues.light;

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
          onClick={() => setKeyfileOpen(true)}
        />
        <SettingRow
          icon={<Lock className="size-4" />}
          label={t.settings.items.password}
          onClick={() => setKeyfileOpen(true)}
        />
        <SettingRow
          icon={<Clock className="size-4" />}
          label={t.settings.items.autoLock}
          value={t.settings.items.autoLockShort}
        />
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

      {/* Logout */}
      <button
        type="button"
        onClick={onLogout}
        className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="size-4" />
        {t.settings.logout}
      </button>

      {/* Modal réutilisée pour keyfile export/import */}
      <SettingsModal
        open={keyfileOpen}
        onClose={() => setKeyfileOpen(false)}
        initialTab="wallet"
      />
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

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
