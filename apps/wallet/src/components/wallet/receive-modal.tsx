import { Copy, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

interface ReceiveModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "bech32" | "hex";

/**
 * Modale « Receive » : affiche l'adresse sous forme de QR code + texte.
 *
 * Deux onglets :
 *  - Bech32m (par défaut) → pour partage humain
 *  - Hex (0x…) → pour intégration RPC/scripts
 */
export function ReceiveModal({ open, onClose }: ReceiveModalProps) {
  const t = useTranslation();
  const { wallet } = useWalletStore();
  const copy = useClipboard();
  const [tab, setTab] = useState<Tab>("bech32");

  // Escape ferme la modale
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !wallet) return null;

  const bech32 = wallet.identity.addressBech32;
  const hex = wallet.identity.addressHex;
  const current = tab === "bech32" ? bech32 : hex;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.receive.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t.receive.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.receive.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.receive.close}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("bech32")}
            className={[
              "rounded-lg px-3 py-1.5 transition-colors",
              tab === "bech32"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.receive.bech32Tab}
          </button>
          <button
            type="button"
            onClick={() => setTab("hex")}
            className={[
              "rounded-lg px-3 py-1.5 transition-colors",
              tab === "hex"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.receive.hexTab}
          </button>
        </div>

        {/* QR code */}
        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl border bg-white p-4">
            <QRCodeSVG
              value={current}
              size={220}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              marginSize={0}
            />
          </div>
        </div>

        {/* Adresse */}
        <div className="mt-5 rounded-xl border bg-muted/40 p-3">
          <p className="break-all font-mono text-[11px] leading-5 text-muted-foreground">
            {current}
          </p>
        </div>

        <button
          type="button"
          onClick={() => copy(current, t.receive.addressCopied)}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Copy className="size-4" />
          {t.receive.copyAddress}
        </button>
      </div>
    </div>
  );
}
