import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthShell } from "@/components/branding/auth-shell";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Page d'accueil — refonte E2.5.
 *
 * Point d'entrée unique de l'onboarding. Trois actions :
 *   - Créer un portefeuille → /create (flow unifié SANGO/EVM/Bitcoin)
 *   - Importer avec ma phrase → /import-evm (mnemonic BIP-39)
 *   - Se connecter → /unlock (déverrouiller le keyring)
 *
 * Le mockup propose une card "multi-chaînes" comme argument produit,
 * alignée sur notre capacité réelle depuis E2.1.b (Bitcoin testnet +
 * mainnet, EVM 6 réseaux, SANGO devnet).
 */
export function Welcome() {
  const t = useTranslation();

  return (
    <AuthShell
      title={t.onboarding.welcome.title}
      subtitle={t.onboarding.welcome.subtitle}
      logoSize={84}
      maxWidth="md"
    >
      {/* Card multi-chaînes */}
      <div className="mt-2 flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Check className="size-4" strokeWidth={3} />
        </div>
        <p className="text-sm font-medium">
          {t.onboarding.welcome.featureChains}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Link
          to="/create"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-4" />
          {t.onboarding.welcome.create}
        </Link>

        <Link
          to="/import-evm"
          className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-primary/30 bg-background text-sm font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          {t.onboarding.welcome.import}
        </Link>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          {t.onboarding.welcome.connect}{" "}
          <Link
            to="/unlock"
            className="font-semibold text-primary hover:underline"
          >
            {t.onboarding.welcome.connectLink}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
