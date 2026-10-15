import { Keyring } from "@sango/wallet-core";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Lock,
  LogOut,
  Moon,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { NetworkSelector } from "@/components/settings/network-selector";
import { FamilySelector } from "@/components/settings/family-selector";
import { SettingsModal } from "@/components/settings/settings-modal";
import { BitcoinNetworkSelector } from "@/features/bitcoin/bitcoin-network-selector";
import { EvmNetworkSelector } from "@/features/evm/evm-network-selector";
import { useTranslation } from "@/i18n/use-translation";
import { EXPLORER_URL } from "@/lib/config";
import {
  AUTO_LOCK_OPTIONS_MS,
  FIAT_CURRENCIES,
  usePreferencesStore,
} from "@/stores/preferences-store";
import { useLocaleStore } from "@/stores/locale-store";
import { useThemeStore } from "@/stores/theme-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page Paramètres — Phase 11 (refonte complète).
 *
 * Sections :
 *   - Card wallet
 *   - SÉCURITÉ      : Recovery, Password (WIP), Auto-lock
 *   - RÉSEAUX       : FamilySelector + sous-sélecteur, Approbations (EVM only)
 *   - NOTIFICATIONS : toggle des toasts de succès
 *   - SANGO         : Validators + Explorer (uniquement family=sango)
 *   - PRÉFÉRENCES   : Langue, Thème, Devise fiat
 *   - AVANCÉ        : Endpoint RPC (SANGO only)
 *   - SUPPORT       : À propos, Terms, Privacy
 *   - ZONE DE DANGER : Effacer toutes les données locales
 *   - Déconnexion
 *
 * **Phase 11** — SANGO-only : la section SANGO et l'endpoint RPC
 * n'apparaissent que si `family === "sango"`. Approbations n'apparaît
 * que si `family === "evm"`.
 */
export function SettingsRoute() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { lock, activeId, family } = useWalletStore();
  const { locale, toggle: toggleLocale } = useLocaleStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  const autoLockMs = usePreferencesStore((s) => s.autoLockMs);
  const setAutoLockMs = usePreferencesStore((s) => s.setAutoLockMs);
  const notificationsEnabled = usePreferencesStore(
    (s) => s.notificationsEnabled,
  );
  const setNotificationsEnabled = usePreferencesStore(
    (s) => s.setNotificationsEnabled,
  );
  const fiatCurrency = usePreferencesStore((s) => s.fiatCurrency);
  const setFiatCurrency = usePreferencesStore((s) => s.setFiatCurrency);

  const [keyfileOpen, setKeyfileOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [autoLockExpanded, setAutoLockExpanded] = useState(false);
  const [fiatExpanded, setFiatExpanded] = useState(false);

  const isSango = family === "sango";
  const isEvm = family === "evm";

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

  const fiatLabel = t.settings.fiatValues[fiatCurrency];

  const autoLockLabel = formatAutoLockLabel(autoLockMs, t);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t.settings.title}
      </h1>

      {/* ── Card wallet ─────────────────────────────────── */}
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

      {/* ── SÉCURITÉ ─────────────────────────────────────── */}
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
              {AUTO_LOCK_OPTIONS_MS.map((ms: number) => {
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

      {/* ── RÉSEAUX ──────────────────────────────────────── */}
      <SettingsSection title={t.settings.sections.networks}>
        <div className="space-y-3 border-b p-3 last:border-b-0">
          <FamilySelector />
          {family === "sango" && <NetworkSelector />}
          {family === "evm" && <EvmNetworkSelector />}
          {family === "bitcoin" && <BitcoinNetworkSelector />}
        </div>
        {isEvm && (
          <SettingRow
            icon={<CheckCircle2 className="size-4" />}
            label={t.settings.items.approvals}
            onClick={() => navigate("/approvals")}
          />
        )}
      </SettingsSection>

      {/* ── NOTIFICATIONS ────────────────────────────────── */}
      <SettingsSection title={t.settings.sections.notifications}>
        <SettingRowToggle
          icon={<BellRing className="size-4" />}
          label={t.settings.items.notificationsToggle}
          help={t.settings.items.notificationsHelp}
          value={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />
      </SettingsSection>

      {/* ── SANGO (conditionnel) ────────────────────────── */}
      {isSango && (
        <SettingsSection title={t.settings.sections.sango}>
          <SettingRow
            icon={<Sparkles className="size-4" />}
            label={t.settings.items.validators}
            onClick={() => navigate("/validators")}
          />
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-accent/40"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ExternalLink className="size-4" />
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {t.settings.items.sangoExplorer}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </a>
        </SettingsSection>
      )}

      {/* ── PRÉFÉRENCES ──────────────────────────────────── */}
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
        <SettingRow
          icon={<Coins className="size-4" />}
          label={t.settings.items.fiatCurrency}
          value={fiatExpanded ? undefined : fiatLabel}
          onClick={() => setFiatExpanded((v) => !v)}
        />
        {fiatExpanded && (
          <div className="border-b bg-muted/20 px-4 py-3 last:border-b-0">
            <p className="mb-2 text-[11px] text-muted-foreground">
              {t.settings.items.fiatCurrencyHelp}
            </p>
            <div className="space-y-1">
              {FIAT_CURRENCIES.map((cur) => {
                const isActive = cur === fiatCurrency;
                return (
                  <button
                    key={cur}
                    type="button"
                    data-testid={`fiat-option-${cur}`}
                    onClick={() => {
                      setFiatCurrency(cur);
                      setFiatExpanded(false);
                    }}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent",
                    ].join(" ")}
                  >
                    <span>{t.settings.fiatValues[cur]}</span>
                    {isActive && <CheckCircle2 className="size-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </SettingsSection>

      {/* ── AVANCÉ (SANGO only) ─────────────────────────── */}
      {isSango && (
        <SettingsSection title={t.settings.sections.advanced}>
          <SettingRow
            icon={<Server className="size-4" />}
            label={t.settings.items.rpcEndpoint}
            value={undefined}
            onClick={() =>
              navigate("/settings", {
                state: { scrollToNetwork: true },
              })
            }
          />
          <p className="border-t px-4 py-2.5 text-[11px] text-muted-foreground">
            {t.settings.items.rpcEndpointHelp}
          </p>
        </SettingsSection>
      )}

      {/* ── SUPPORT ──────────────────────────────────────── */}
      <SettingsSection title={t.settings.sections.support}>
        <SettingRow
          icon={<Info className="size-4" />}
          label={t.settings.items.about}
          value={t.settings.version}
        />
        <SettingRow
          icon={<FileText className="size-4" />}
          label={t.settings.items.terms}
          onClick={() => navigate("/legal/terms")}
        />
        <SettingRow
          icon={<ShieldCheck className="size-4" />}
          label={t.settings.items.privacy}
          onClick={() => navigate("/legal/privacy")}
        />
      </SettingsSection>

      {/* ── ZONE DE DANGER ──────────────────────────────── */}
      <DangerZone />

      {/* ── Déconnexion ──────────────────────────────────── */}
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

// ── DangerZone ──────────────────────────────────────────────

function DangerZone() {
  const t = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = confirm.trim() === "RESET";

  async function onReset() {
    if (!matches) return;
    setBusy(true);
    try {
      // 1. Détruire les instances runtime.
      const state = useWalletStore.getState();
      for (const entry of Object.values(state.wallets)) {
        entry.wallet.destroy();
      }
      state.noWallet();

      // 2. Vider le keyring IndexedDB.
      try {
        const kr = await Keyring.open();
        await kr.clear();
        kr.close();
      } catch {
        /* idb peut ne pas exister */
      }

      // 3. Vider localStorage (préférences, session persistée, etc.).
      try {
        localStorage.clear();
      } catch {
        /* storage peut être indisponible */
      }

      // 4. Retour à l'accueil.
      toast.success(t.settings.items.resetAll);
      navigate("/welcome");
    } catch (err) {
      toast.error("Erreur", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-destructive/80">
        {t.settings.sections.danger}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/[0.03]">
        <button
          type="button"
          data-testid="danger-zone-trigger"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-destructive/[0.06]"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Trash2 className="size-4" />
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-destructive">
            {t.settings.items.resetAll}
          </span>
          <ChevronRight
            className={[
              "size-4 shrink-0 text-destructive/60 transition-transform",
              open ? "rotate-90" : "",
            ].join(" ")}
          />
        </button>
        {open && (
          <div className="space-y-3 border-t border-destructive/20 px-4 py-4">
            <p className="flex items-start gap-2 text-[11px] text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {t.settings.items.resetAllHelp}
            </p>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-destructive">
                {t.settings.items.resetConfirmInput}
              </span>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                data-testid="danger-zone-input"
                className="flex h-10 w-full rounded-lg border border-destructive/40 bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-destructive/60"
              />
            </label>

            <button
              type="button"
              data-testid="danger-zone-confirm"
              onClick={onReset}
              disabled={!matches || busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-destructive text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              {t.settings.items.resetConfirmButton}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Helpers ─────────────────────────────────────────────────

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

interface SettingRowToggleProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly help?: string;
  readonly value: boolean;
  readonly onChange: (v: boolean) => void;
}

function SettingRowToggle({
  icon,
  label,
  help,
  value,
  onChange,
}: SettingRowToggleProps) {
  return (
    <div className="flex items-start gap-3 border-b px-4 py-3.5 last:border-b-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {help && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{help}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          value ? "bg-primary" : "bg-muted",
        ].join(" ")}
      >
        <span
          className={[
            "size-5 rounded-full bg-white shadow-sm transition-transform",
            value ? "translate-x-[22px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
