import { Copy, Download, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";

interface Props {
  readonly label: string;
  readonly networkLabel?: string;
  readonly address: string;
  /** Identifiant du bloc pour les tests (`receive-card-evm`, etc.). */
  readonly testId: string;
}

/**
 * Card de réception pour une famille — Phase 7.
 *
 * Affiche un QR code (canvas, téléchargeable), l'adresse tronquée et
 * trois actions : Copier, Partager (Web Share API si dispo),
 * Télécharger le QR en PNG.
 *
 * **Invariant** : `address` est la source unique — QR et texte
 * proviennent du même paramètre. Pas de conversion entre familles.
 */
export function ReceiveFamilyCard({
  label,
  networkLabel,
  address,
  testId,
}: Props) {
  const t = useTranslation();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success(t.receivePage.actions.copied);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible");
    }
  }

  async function onShare() {
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string }) => Promise<void>;
    };
    if (!nav.share) {
      await onCopy();
      return;
    }
    try {
      await nav.share({ title: label, text: address });
    } catch {
      /* annulé par l'utilisateur */
    }
  }

  function onDownload() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-${testId}-${address.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section
      data-testid={testId}
      className="rounded-2xl border bg-card p-5"
    >
      <header>
        <p className="text-sm font-semibold">{label}</p>
        {networkLabel && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {networkLabel}
          </p>
        )}
      </header>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          ref={qrRef}
          className="shrink-0 rounded-2xl border bg-white p-3"
        >
          <QRCodeCanvas
            value={address}
            size={140}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            marginSize={0}
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="break-all font-mono text-[11px] leading-5 text-muted-foreground">
            {address}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          data-testid={`${testId}-copy`}
          onClick={onCopy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Copy className="size-3.5" />
          {copied ? "✓" : t.receivePage.actions.copy}
        </button>
        <button
          type="button"
          data-testid={`${testId}-share`}
          onClick={onShare}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background text-xs font-medium transition-colors hover:bg-accent"
        >
          <Share2 className="size-3.5" />
          {t.receivePage.actions.share}
        </button>
        <button
          type="button"
          data-testid={`${testId}-download`}
          onClick={onDownload}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-background text-xs font-medium transition-colors hover:bg-accent"
        >
          <Download className="size-3.5" />
          {t.receivePage.actions.download}
        </button>
      </div>
    </section>
  );
}
