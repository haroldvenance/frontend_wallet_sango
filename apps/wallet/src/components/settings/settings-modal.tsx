import type { StoredWalletV1 } from "@sango/wallet-core";
import { Keyring, type KeyringEntry } from "@sango/wallet-core";
import {
  AlertTriangle,
  Download,
  Lock,
  Sliders,
  Upload,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import {
  deserializeKeyfile,
  downloadJson,
  pickJsonFile,
  serializeKeyfile,
} from "@/lib/keyfile";
import { isFiatAvailable } from "@/lib/fiat";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useSangoWallet } from "@/hooks/use-sango-wallet";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "security" | "preferences" | "wallet";

export function SettingsModal({ open, onClose }: Props) {
  const t = useTranslation();
  const [tab, setTab] = useState<Tab>("security");

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{t.settings.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-muted/30">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm transition-colors",
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

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {tab === "security" && <SecurityTab />}
          {tab === "preferences" && <PreferencesTab />}
          {tab === "wallet" && <WalletTab onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

// --- Onglet Sécurité -------------------------------------------------------

function SecurityTab() {
  const t = useTranslation();
  const { lock } = useWalletStore();
  return (
    <div className="space-y-4">
      <Row label={t.settings.security.autoLock} value={t.settings.security.autoLockValue} />
      <Row label={t.settings.security.clipboard} value={t.settings.security.clipboardValue} />
      <button
        type="button"
        onClick={lock}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium transition-colors hover:bg-accent"
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

// --- Onglet Préférences ----------------------------------------------------

function PreferencesTab() {
  const t = useTranslation();
  const { showFiat, setShowFiat } = usePreferencesStore();
  const fiatAvailable = isFiatAvailable();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t.preferences.fiat.toggleLabel}</p>
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
              "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40",
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

// --- Onglet Wallet --------------------------------------------------------

function WalletTab({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const wallet = useSangoWallet();
  const { noWallet } = useWalletStore();
  const format = useWalletStore((s) => s.format);
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
        // KeyringEntry.stored est une union StoredWalletV1 | StoredWalletV2.
        // Le keyfile export est SANGO-spécifique ('sango-wallet-keyfile') :
        // il ne peut sérialiser qu'un V1. Guard runtime — le state reste
        // StoredWalletV1 | null, l'UI désactive l'export si null.
        // (Patch 5 : export BIP-39 séparé pour les wallets EVM.)
        const s = active?.stored;
        setStored(s && s.version === 1 ? s : null);
      } catch {
        setStored(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  async function handleExport() {
    if (!stored) return toast.error(t.keyfile.exportUnavailable);
    setBusy(true);
    try {
      const payload = serializeKeyfile(stored);
      const filename = `sango-wallet-${stored.addressHex.slice(2, 10)}.keyfile.json`;
      downloadJson(filename, payload);
      toast.success(t.keyfile.exported, { description: filename });
    } catch (e) {
      toast.error(t.keyfile.exportFailed, { description: (e as Error).message });
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
        label: "Importé",
        format: "sango-legacy",
        networkId: "sango-devnet",
        stored: newStored,
        createdAt: Date.now(),
      });
      kr.close();
      toast.success(t.keyfile.imported, {
        description: "Recharge la page pour te déverrouiller",
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
      toast.error(t.keyfile.importFailed, { description: msg });
      setBusy(false);
    }
  }

  // UX-2.d — Le keyfile export est SANGO-spécifique ('sango-wallet-keyfile'
  // V1). Les wallets BIP-39 EVM auront un format dédié en E1.6.
  if (format === "bip39") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed bg-card/60 p-4">
          <p className="text-sm font-medium">Keyfile BIP-39</p>
          <p className="mt-1 text-xs text-muted-foreground">
            La gestion du keyfile pour les wallets EVM sera disponible
            prochainement (E1.6).
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            En attendant, ton wallet est chiffré et persisté localement dans
            le keyring. Tu peux le verrouiller via l&apos;onglet Sécurité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">{t.keyfile.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.keyfile.subtitle}</p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={!stored || busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Download className="size-4" /> {t.keyfile.export}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50"
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
