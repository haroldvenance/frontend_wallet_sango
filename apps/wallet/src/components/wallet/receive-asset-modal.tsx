import { Copy, Download, Share2, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly address: string;
  readonly symbol?: string;
}

export function ReceiveAssetModal({ open, onClose, address, symbol }: Props) {
  const t = useTranslation();
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success(t.assetDetail.receive.copied);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t.assetDetail.receive.copyError);
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
      await nav.share({ title: symbol ?? "Receive", text: address });
    } catch {
      /* annulé */
    }
  }

  function onDownload() {
    const canvas = qrWrapperRef.current?.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${symbol ?? "address"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="receive-asset-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              {t.assetDetail.receive.title}
              {symbol && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {symbol}
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.assetDetail.receive.subtitle}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t.assetDetail.receive.close}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          <div ref={qrWrapperRef} className="rounded-2xl border bg-white p-4">
            <QRCodeCanvas
              value={address}
              size={220}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              marginSize={4}
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border bg-muted/40 p-3">
          <p className="break-all font-mono text-[11px] leading-5 text-muted-foreground">
            {address}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            data-testid="receive-copy"
            onClick={onCopy}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Copy className="size-3.5" />
            {t.assetDetail.receive.copy}
          </button>
          <button
            type="button"
            data-testid="receive-share"
            onClick={onShare}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border bg-background text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Share2 className="size-3.5" />
            {t.assetDetail.receive.share}
          </button>
          <button
            type="button"
            data-testid="receive-download"
            onClick={onDownload}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border bg-background text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Download className="size-3.5" />
            {t.assetDetail.receive.download}
          </button>
        </div>

        <div aria-live="polite" className="sr-only">
          {copied ? t.assetDetail.receive.copied : ""}
        </div>
      </div>
    </div>
  );
}