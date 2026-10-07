import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { LocaleToggle } from "@/components/settings/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";

import { SangoLogo } from "./sango-logo";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  halo?: boolean;
  logoSize?: number;
  footer?: ReactNode;
  maxWidth?: "md" | "lg" | "xl";
  /**
   * Indicateur d'étape optionnel (E2.5).
   * Affiche "Étape X sur Y" en haut à droite + barre de progression.
   */
  step?: { readonly current: number; readonly total: number };
}

export function AuthShell({
  title,
  subtitle,
  children,
  backTo,
  backLabel = "Retour",
  halo = true,
  logoSize = 56,
  footer,
  maxWidth = "md",
  step,
}: Props) {
  const maxW = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[maxWidth];

  return (
    <div
      className={[
        "relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6",
        // pt-28 : toolbar toggles (top-4 + h-9 = ~52px) + step bar (~90px) + marge
        // pt-20 : toolbar toggles seule
        step ? "pt-32 pb-12" : "pt-20 pb-12",
      ].join(" ")}
    >
      {halo && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.10),transparent_60%)]"
        />
      )}

      {/* Bouton Retour — positionné en haut à gauche de la fenêtre */}
      {backTo && (
        <Link
          to={backTo}
          className="group absolute left-6 top-6 z-10 inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:-translate-x-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-md"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          {backLabel}
        </Link>
      )}

      {/* Toolbar flottant top-right : toggles thème + langue */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LocaleToggle />
      </div>

      {step && (
        <div className="absolute left-0 right-0 top-20 z-10">
          <div className="mx-auto w-full max-w-md px-6">
            <p className="mb-2 text-right text-[11px] text-muted-foreground">
              Étape {step.current} sur {step.total}
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: step.total }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < step.current ? "bg-primary" : "bg-muted",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={["w-full", maxW].join(" ")}>
        <header className="mb-8 flex flex-col items-center text-center">
          <SangoLogo size={logoSize} className="mb-5" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </header>

        <main>{children}</main>

        {footer && (
          <footer className="mt-10 text-center text-[11px] text-muted-foreground">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
