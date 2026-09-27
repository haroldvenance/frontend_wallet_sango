import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { SangoLogo } from "./sango-logo";

interface Props {
  /** Titre principal (h1). */
  title: string;
  /** Sous-titre optionnel. */
  subtitle?: string;
  /** Contenu de l'écran (formulaire, cartes, etc.). */
  children: ReactNode;
  /** Affiche un bouton "Retour" en haut à gauche vers cette route. */
  backTo?: string;
  /** Label du bouton retour. Défaut : "Retour". */
  backLabel?: string;
  /** Affiche le halo décoratif en haut (défaut : true). */
  halo?: boolean;
  /** Taille du logo (défaut : 72 pour welcome, 56 pour les autres). */
  logoSize?: number;
  /** Contenu additionnel en bas de page (footer). */
  footer?: ReactNode;
  /** Largeur max du contenu (défaut : max-w-md). */
  maxWidth?: "md" | "lg" | "xl";
}

/**
 * Wrapper pour tous les écrans d'auth (welcome, create, import, unlock).
 *
 * Fournit :
 *  - Fond avec halo violet subtil
 *  - Logo Sango centré
 *  - Titre + sous-titre uniformes
 *  - Bouton "Retour" optionnel
 *  - Espacement vertical cohérent
 *
 * Usage :
 *   <AuthShell title="Créer un wallet" subtitle="..." backTo="/welcome">
 *     <form>...</form>
 *   </AuthShell>
 */
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
}: Props) {
  const maxW = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[maxWidth];

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-12">
      {halo && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.10),transparent_60%)]"
        />
      )}

      <div className={["w-full", maxW].join(" ")}>
        {backTo && (
          <Link
            to={backTo}
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {backLabel}
          </Link>
        )}

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
