import { bitcoinNetworkById, evmNetworkById } from "@sango/wallet-chains";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthShell } from "@/components/branding/auth-shell";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Label des réseaux supportés, construit à partir du registre
 * `@sango/wallet-chains` (source unique de vérité).
 * SANGO est explicitement marqué "devnet".
 */
function buildSupportedNetworksLabel(): string {
  const evmIds = ["ethereum", "bsc", "base", "arbitrum-one"] as const;
  const evmNames = evmIds
    .map((id) => evmNetworkById(id)?.name)
    .filter((n): n is string => Boolean(n));
  const btcName = bitcoinNetworkById("bitcoin-mainnet")?.name ?? "Bitcoin";
  return ["SANGO (devnet)", ...evmNames, btcName].join(" · ");
}

const SUPPORTED_NETWORKS_LABEL = buildSupportedNetworksLabel();

export function Welcome() {
  const t = useTranslation();

  return (
    <AuthShell
      title={t.onboarding.welcome.title}
      subtitle={t.onboarding.welcome.subtitle}
      logoSize={84}
      maxWidth="md"
    >
      <div className="mt-2 flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Check className="size-4" strokeWidth={3} />
        </div>
        <p className="text-sm font-medium">
          {t.onboarding.welcome.featureChains}
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {t.onboarding.welcome.selfCustody}
      </p>

      <p className="mt-1 text-center text-[11px] text-muted-foreground/80">
        {SUPPORTED_NETWORKS_LABEL}
      </p>

      <div className="mt-6 space-y-3">
        <Link
          to="/create"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Sparkles className="size-4" />
          {t.onboarding.welcome.create}
        </Link>

        <Link
          to="/import"
          className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-primary/30 bg-background text-sm font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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