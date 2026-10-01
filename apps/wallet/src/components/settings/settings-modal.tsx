import type { StoredWalletV1, StoredWalletV2 } from "@sango/wallet-core";
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
  deserializeBip39Keyfile,
  serializeBip39Keyfile,
} from "@/lib/bip39-keyfile";
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

// --- Onglet Wallet (dispatcher) -------------------------------------------

/**
 * Dispatcher selon le format du wallet actif.
 *
 *   - sango-legacy  → SangoWalletTab (keyfile V1 existant)
 *   - bip39         → Bip39WalletTab (keyfile V2, E1.6.b)
 */
function WalletTab({ onClose }: { onClose: () => void }) {
  const format = useWalletStore((s) => s.format);
  if (format === "bip39") return <Bip39WalletTab onClose={onClose} />;
  return <SangoWalletTab onClose={onClose} />;
}

// --- Sous-onglet SANGO legacy (keyfile V1) --------------------------------

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

// --- Sous-onglet BIP-39 EVM (keyfile V2) ----------------------------------

/**
 * Gestion du keyfile BIP-39 (`sango-bip39-keyfile` v1).
 *
 * **D-E1.6-6** — Format propriétaire de sauvegarde/restauration. Pas
 * de compatibilité MetaMask. La mnemonic n'est jamais persistée ni
 * exportée (invariant D-HD-1).
 *
 * Le `StoredWalletV2` est chargé depuis le keyring (déjà chiffré au
 * moment de la création). L'export ne demande pas de password.
 *
 * L'import reconstruit un `StoredWalletV2` et le persiste dans le
 * keyring avec le `format: "bip39"` et le `networkId` du fichier.
 * L'utilisateur devra ensuite déverrouiller avec le password d'origine
 * (celui utilisé à la création du wallet exporté).
 */
function Bip39WalletTab({ onClose }: { onClose: () => void }) {
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

        // Filtre : uniquement les entrées BIP-39.
        const bip39Entries = entries.filter((e) => e.format === "bip39");
        if (bip39Entries.length === 0) {
          setStored(null);
          setNetworkId(null);
          return;
        }

        // Priorité : l'entrée la plus récente.
        const active = bip39Entries.sort((a, b) => b.createdAt - a.createdAt)[0];
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
        setStored(null);
        setNetworkId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [format]);

  async function handleExport() {
    if (!stored || !networkId) {
      return toast.error("Aucun wallet BIP-39 actif à exporter");
    }
    setBusy(true);
    try {
      const payload = serializeBip39Keyfile(stored, networkId);
      const filename = `sango-bip39-${stored.addressHex.slice(2, 10)}.keyfile.json`;
      downloadJson(filename, payload);
      toast.success("Keyfile BIP-39 exporté", { description: filename });
    } catch (e) {
      toast.error("Export impossible", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const raw = await pickJsonFile();

      // Détection du format : refus si c'est un keyfile V1 (legacy).
      const obj = raw as { format?: unknown };
      if (obj.format === "sango-wallet-keyfile") {
        toast.error("Format incompatible", {
          description:
            "Ce fichier est un keyfile SANGO legacy (Ed25519). Il doit être importé via un wallet SANGO (pas EVM).",
        });
        setBusy(false);
        return;
      }

      const { stored: newStored, networkId: newNetworkId } =
        deserializeBip39Keyfile(raw);

      const kr = await Keyring.open();
      await kr.put({
        id: newStored.addressHex.toLowerCase(),
        label: "EVM importé",
        format: "bip39",
        networkId: newNetworkId,
        stored: newStored,
        createdAt: Date.now(),
      });
      kr.close();

      toast.success("Keyfile BIP-39 importé", {
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
      toast.error("Import impossible", { description: msg });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">Keyfile BIP-39</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Format propriétaire <code>sango-bip39-keyfile</code> — sauvegarde
          et restauration du wallet EVM. Compatible avec ce wallet uniquement.
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={!stored || busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Download className="size-4" /> Exporter
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <Upload className="size-4" /> Importer
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          Ce keyfile contient le <strong>seed BIP-39 chiffré</strong>. La
          phrase de récupération n&apos;est jamais exportée. Conserve ce
          fichier et son mot de passe séparément.
        </p>
      </div>
    </div>
  );
}
