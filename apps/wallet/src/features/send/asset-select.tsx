import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AssetLogo } from "@/components/branding/asset-logo";

/**
 * Sélecteur d'actif custom — Phase 10.3.
 *
 * Remplace le `<select>` natif (moche, sans logos) par un popover
 * cohérent avec le SendShell. Affiche pour chaque option :
 *   - logo de l'actif ;
 *   - symbole + nom ;
 *   - solde disponible.
 *
 * **Périmètre** : présentation pure. Ne connaît ni le réseau ni la
 * famille — reçoit une liste d'options déjà résolues par l'appelant.
 *
 * Popover local (état `open` + détection de clic extérieur), pas de
 * store UI global.
 */
export interface AssetSelectOption {
  /** Identifiant interne (ex. `"eth"` sentinel natif ou `0x…` contrat). */
  readonly id: string;
  /** Identifiant "humain" (ex. `"eth"`, `"bnb"`, `"usdc"`) — pour `AssetLogo`. */
  readonly assetId: string;
  readonly symbol: string;
  readonly name: string;
  /** Solde formaté (chaîne prête à afficher, `—` / `…` / `0.5`). */
  readonly balance: string;
  readonly isNative: boolean;
}

interface Props {
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly options: readonly AssetSelectOption[];
  readonly disabled?: boolean;
  readonly ariaLabel?: string;
}

export function AssetSelect({
  value,
  onChange,
  options,
  disabled,
  ariaLabel = "Actif",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.id === value) ?? options[0];

  // Ferme au clic extérieur.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Ferme sur Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!current) return null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        data-testid="asset-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex h-14 w-full items-center gap-3 rounded-xl border bg-background px-3.5 text-left transition-colors",
          open
            ? "border-primary ring-2 ring-ring"
            : "border-input hover:border-primary/40",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <AssetLogo assetId={current.assetId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{current.symbol}</p>
            {current.isNative && (
              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                NATIF
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {current.balance} {current.symbol}
          </p>
        </div>
        <ChevronDown
          className={[
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {/* Popover */}
      {open && (
        <div
          role="listbox"
          data-testid="asset-select-listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border bg-card shadow-lg"
        >
          {options.map((opt) => {
            const isActive = opt.id === current.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isActive}
                data-testid={`asset-select-option-${opt.assetId}`}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
                  isActive ? "bg-primary/5" : "hover:bg-accent/60",
                ].join(" ")}
              >
                <AssetLogo assetId={opt.assetId} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">
                      {opt.symbol}
                    </p>
                    {opt.isNative && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                        NATIF
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {opt.name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs">{opt.balance}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {opt.symbol}
                  </p>
                </div>
                {isActive && (
                  <Check className="size-4 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
