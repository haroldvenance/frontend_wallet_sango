/**
 * ⚠️ COMPOSANT LEGACY — dépréciation progressive.
 *
 * Ce modal Settings (500+ lignes) est un doublon partiel de
 * `routes/settings.tsx` et `routes/settings-recovery-phrase.tsx`.
 * Il n'est plus utilisé que pour **l'export/import keyfile** depuis
 * ces deux pages, via `<SettingsModal initialTab="wallet" />`.
 *
 * Plan de dépréciation (à exécuter avant V1.1) :
 *   1. Créer `components/settings/keyfile-dialog.tsx` (autonome,
 *      un seul onglet, pas de tabs ni de tab "security" /
 *      "preferences" déjà rendus par `/settings`).
 *   2. Remplacer les 2 usages `initialTab="wallet"` par ce nouveau
 *      composant.
 *   3. Supprimer `settings-modal.tsx`.
 *
 * ⚠️ Ne PAS ajouter de fonctionnalité à ce composant. Il reste
 * fonctionnel uniquement pour ne pas bloquer la release.
 */
import {
  Keyring,
  type KeyringEntry,
  type StoredWalletV1,
  type StoredWalletV2,
} from "@sango/wallet-core";
import {
  AlertTriangle,
  Download,
  Lock,
  Sliders,
  Upload,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { useSangoWallet } from "@/hooks/use-sango-wallet";
import { useTranslation } from "@/i18n/use-translation";
import {
  deserializeBip39Keyfile,
  serializeBip39Keyfile,
} from "@/lib/bip39-keyfile";
import { isFiatAvailable } from "@/lib/fiat";
import {
  deserializeKeyfile,
  downloadJson,
  pickJsonFile,
  serializeKeyfile,
} from "@/lib/keyfile";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useWalletStore } from "@/stores/wallet-store";

// ── Types ───────────────────────────────────────────────────

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly initialTab?: Tab;
}

type Tab = "security" | "preferences" | "wallet";

// ── Composant principal ─────────────────────────────────────

export function SettingsModal({
  open,
  onClose,
  initialTab = "security",
}: Props) {
  const t = useTranslation();
  const [tab, setTab] = useState<Tab>(initialTab);
  const titleId = useId();

  // Resynchronise l'onglet quand le modal s'ouvre avec un `initialTab`
  // différent (ex. "wallet" depuis le bouton "Gérer").
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // Fermeture ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: typeof Lock }[] = [
    { id: "security", label: t.settings.tabs.security, icon: Lock },
    { id: "preferences", label: t.settings.tabs.preferences, icon: Sliders },
    { id: "wallet", label: t.settings.tabs.wallet, icon: WalletIcon },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {t.settings.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.keyfile.close}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex border-b bg-muted/30">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={[
                "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                tab === id
                  ? "border-b-2 border-primary font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent/50",
              ].join(" ")}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {tab === "security" && <SecurityTab />}
          {tab === "preferences" && <PreferencesTab />}
          {tab === "wallet" && <WalletTab onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

// ── Onglet Sécurité ─────────────────────────────────────────

function SecurityTab() {
  const t = useTranslation();
  const { lock } = useWalletStore();
  return (
    <div className="space-y-4">
      <Row
        label={t.settings.security.autoLock}
        value={t.settings.security.autoLockValue}
      />
      <Row
        label={t.settings.security.clipboard}
        value={t.settings.security.clipboardValue}
      />
      <button
        type="button"
        onClick={lock}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Lock className="size-4" />
        {t.settings.security.lockNow}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-3">
      <span className="text-sm">{label}</span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

// ── Onglet Préférences ──────────────────────────────────────

function PreferencesTab() {
  const t = useTranslation();
  const { showFiat, setShowFiat } = usePreferencesStore();
  const fiatAvailable = isFiatAvailable();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {t.preferences.fiat.toggleLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.preferences.fiat.toggleHelp}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showFiat}
            onClick={() => setShowFiat(!showFiat)}
            disabled={!fiatAvailable}
            className={[
              "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-40",
              showFiat && fiatAvailable ? "bg-primary" : "bg-muted",
            ].join(" ")}
          >
            <span
              className={[
                "size-5 rounded-full bg-white shadow-sm transition-transform",
                showFiat && fiatAvailable
                  ? "translate-x-[22px]"
                  : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>

        {!fiatAvailable && (
          <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            {t.preferences.fiat.unavailable}
          </p>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          {t.preferences.fiat.disclaimer}
        </p>
      </div>
    </div>
  );
}

// ── Onglet Wallet (dispatcher) ──────────────────────────────

function WalletTab({ onClose }: { onClose: () => void }) {
  const format = useWalletStore((s) => s.format);
  if (format === "bip39") return <Bip39WalletTab onClose={onClose} />;
  return <SangoWalletTab onClose={onClose} />;
}

// ── Wallet SANGO legacy (keyfile V1) ────────────────────────

function SangoWalletTab({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const wallet = useSangoWallet();
  const { noWallet } = useWalletStore();
  const [busy, setBusy] = useState(false);
  const [stored, setStored] = useState<StoredWalletV1 | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kr = await Keyring.open();
        const entries = await kr.list();
        kr.close();
        if (cancelled) return;
        if (entries.length === 0) return setStored(null);
        const activeId = wallet?.identity.addressHex.toLowerCase();
        const active =
          entries.find((e: KeyringEntry) => e.id === activeId) ??
          entries.sort((a, b) => b.createdAt - a.createdAt)[0];
        // Keyfile export = SANGO-spécifique : uniquement V1.
        const s = active?.stored;
        setStored(s && s.version === 1 ? s : null);
      } catch {
        if (!cancelled) setStored(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  async function handleExport() {
    if (!stored) {
      toast.error(t.keyfile.exportUnavailable);
      return;
    }
    setBusy(true);
    try {
      const payload = serializeKeyfile(stored);
      // Filename sans fragment d'adresse (pas de trace partielle dans
      // le dossier Téléchargements).
      const filename = "sango-wallet-keyfile.json";
      downloadJson(filename, payload);
      toast.success(t.keyfile.exported);
    } catch {
      // Jamais `(e as Error).message` — peut contenir un chemin, un
      // identifiant interne, etc.
      toast.error(t.keyfile.exportFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const raw = await pickJsonFile();
      const newStored = deserializeKeyfile(raw);
      const kr = await Keyring.open();
      await kr.put({
        id: newStored.addressHex.toLowerCase(),
        label: t.keyfile.importedLabel,
        format: "sango-legacy",
        networkId: "sango-devnet",
        stored: newStored,
        createdAt: Date.now(),
      });
      kr.close();
      toast.success(t.keyfile.imported, {
        description: t.keyfile.reloadToUnlock,
      });
      noWallet();
      setBusy(false);
      onClose();
    } catch (e) {
      // Annulation utilisateur : message d'erreur silencieux.
      const msg = (e as Error).message;
      if (msg === "Sélection annulée" || msg === "Sélection expirée") {
        setBusy(false);
        return;
      }
      toast.error(t.keyfile.importFailed);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">{t.keyfile.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.keyfile.subtitle}
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={!stored || busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            <Download className="size-4" /> {t.keyfile.export}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            <Upload className="size-4" /> {t.keyfile.import}
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          {t.keyfile.warning}
        </p>
      </div>
    </div>
  );
}

// ── Wallet BIP-39 (keyfile V2) ──────────────────────────────

function Bip39WalletTab({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const { noWallet } = useWalletStore();
  const format = useWalletStore((s) => s.format);
  const [busy, setBusy] = useState(false);
  const [stored, setStored] = useState<StoredWalletV2 | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kr = await Keyring.open();
        const entries = await kr.list();
        kr.close();
        if (cancelled) return;

        const bip39Entries = entries.filter((e) => e.format === "bip39");
        if (bip39Entries.length === 0) {
          setStored(null);
          setNetworkId(null);
          return;
        }

        const active = bip39Entries.sort(
          (a, b) => b.createdAt - a.createdAt,
        )[0];
        if (!active) return;

        const s = active.stored;
        if (s && s.version === 2) {
          setStored(s);
          setNetworkId(active.networkId);
        } else {
          setStored(null);
          setNetworkId(null);
        }
      } catch {
        if (!cancelled) {
          setStored(null);
          setNetworkId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [format]);

  async function handleExport() {
    if (!stored || !networkId) {
      toast.error(t.keyfile.bip39NoWallet);
      return;
    }
    setBusy(true);
    try {
      const payload = serializeBip39Keyfile(stored, networkId);
      // Filename neutre — pas de fragment d'adresse dans Downloads.
      const filename = "sango-bip39-keyfile.json";
      downloadJson(filename, payload);
      toast.success(t.keyfile.bip39ExportSuccess);
    } catch {
      toast.error(t.keyfile.bip39ExportFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const raw = await pickJsonFile();

      // Détection du format : refus explicite si c'est un keyfile V1.
      const obj = raw as { format?: unknown };
      if (obj.format === "sango-wallet-keyfile") {
        toast.error(t.keyfile.incompatibleFormat, {
          description: t.keyfile.incompatibleFormatDesc,
        });
        setBusy(false);
        return;
      }

      const { stored: newStored, networkId: newNetworkId } =
        deserializeBip39Keyfile(raw);

      const kr = await Keyring.open();
      await kr.put({
        id: newStored.addressHex.toLowerCase(),
        label: t.keyfile.importedBip39Label,
        format: "bip39",
        networkId: newNetworkId,
        stored: newStored,
        createdAt: Date.now(),
      });
      kr.close();

      toast.success(t.keyfile.bip39ImportSuccess, {
        description: t.keyfile.reloadToUnlock,
      });
      noWallet();
      setBusy(false);
      onClose();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "Sélection annulée" || msg === "Sélection expirée") {
        setBusy(false);
        return;
      }
      toast.error(t.keyfile.bip39ImportFailed);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">{t.keyfile.bip39Title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.keyfile.bip39Subtitle}
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={!stored || busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            <Download className="size-4" /> {t.keyfile.bip39ExportButton}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
          >
            <Upload className="size-4" /> {t.keyfile.bip39ImportButton}
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          {t.keyfile.bip39Warning}
        </p>
      </div>
    </div>
  );
}