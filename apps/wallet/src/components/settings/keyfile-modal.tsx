import type { StoredWallet } from "@sango/wallet-core";
import { Keyring, type KeyringEntry } from "@sango/wallet-core";
import { AlertTriangle, Download, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import {
  deserializeKeyfile,
  downloadJson,
  pickJsonFile,
  serializeKeyfile,
} from "@/lib/keyfile";
import { useWalletStore } from "@/stores/wallet-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyfileModal({ open, onClose }: Props) {
  const t = useTranslation();
  const { wallet, noWallet } = useWalletStore();
  const [busy, setBusy] = useState(false);
  const [stored, setStored] = useState<StoredWallet | null>(null);
  const [loading, setLoading] = useState(true);

  // Charge le wallet actif depuis le keyring à l'ouverture.
  useEffect(() => {
    if (!open) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const kr = await Keyring.open();
        const entries = await kr.list();
        kr.close();

        if (cancelled) return;

        if (entries.length === 0) {
          setStored(null);
          return;
        }

        // Priorité : le wallet actif du store, sinon le plus récent.
        const activeId = wallet?.identity.addressHex.toLowerCase();
        const active =
          entries.find((e: KeyringEntry) => e.id === activeId) ??
          entries.sort((a, b) => b.createdAt - a.createdAt)[0];

        setStored(active?.stored ?? null);
      } catch (e) {
        console.error("[keyfile-modal] keyring read failed", e);
        setStored(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, wallet]);

  // Escape ferme.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBusy(false);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Garde-fou : reset busy si bloqué > 60 s.
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setBusy(false), 60_000);
    return () => clearTimeout(timer);
  }, [busy]);

  if (!open) return null;

  const canExport = !loading && !!stored;

  async function handleExport() {
    if (!stored) {
      toast.error(t.keyfile.exportUnavailable);
      return;
    }
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

      // Écrit dans le keyring IndexedDB.
      const kr = await Keyring.open();
      await kr.put({
        id: newStored.addressHex.toLowerCase(),
        label: "Importé",
        network: newStored.network,
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
      // Annulation silencieuse.
      if (msg === "Sélection annulée" || msg === "Sélection expirée") {
        setBusy(false);
        return;
      }
      toast.error(t.keyfile.importFailed, { description: msg });
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        setBusy(false);
        onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.keyfile.title}</h2>
          <button
            type="button"
            onClick={() => {
              setBusy(false);
              onClose();
            }}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{t.keyfile.subtitle}</p>

        {!loading && !stored && (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-600 dark:text-amber-400">
            Aucun wallet dans le keyring. Crée ou importe d'abord un wallet.
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>{t.keyfile.warning}</span>
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport || busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
            title={!canExport ? t.keyfile.exportUnavailable : undefined}
          >
            <Download className="size-4" />
            {busy ? "…" : loading ? "…" : t.keyfile.export}
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-card text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <Upload className="size-4" /> {t.keyfile.import}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setBusy(false);
            onClose();
          }}
          className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl text-xs text-muted-foreground hover:bg-accent"
        >
          Fermer
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          {t.keyfile.footer}
        </p>
      </div>
    </div>
  );
}
