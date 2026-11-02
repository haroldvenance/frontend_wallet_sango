import { Bip39Wallet, Wallet } from "@sango/wallet-core";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { ReceiveFamilyCard } from "@/features/receive/receive-family-card";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page `/receive` — affiche les adresses de réception du wallet actif.
 *
 * **Honnêteté réseau** : SANGO n'a pas de mainnet — l'adresse dérivée
 * est nécessairement `tsango1…` (testnet). Le label est forcé
 * "SANGO (devnet)" pour ne jamais laisser croire à un mainnet actif.
 *
 * EVM : une seule adresse partagée entre Ethereum / BSC / Base /
 * Arbitrum (même dérivation `m/44'/60'/…`). Bitcoin : mainnet
 * uniquement (testnets masqués en production).
 *
 * Invariant : toutes les adresses proviennent de la même identité HD
 * locale — aucune n'est inventée si indisponible.
 */
export function ReceiveRoute() {
  const t = useTranslation();
  const wallet = useWalletStore((s) => s.wallet);
  const format = useWalletStore((s) => s.format);

  if (!wallet) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <ArrowLeft className="size-3" /> Retour
        </Link>
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{t.receivePage.empty}</p>
        </div>
      </div>
    );
  }

  let evmAddress: string | null = null;
  let btcAddress: string | null = null;
  let sangoAddress: string | null = null;

  // `format` (source de vérité du store) est plus fiable qu'`instanceof`
  // en environnement pnpm / multi-copy.
  if (format === "bip39") {
    const w = wallet as Bip39Wallet;
    evmAddress = w.getIdentity(0).addressHex;
    btcAddress = w.getBitcoinIdentity("mainnet", 0, 0).address;
    sangoAddress = w.getSangoIdentity(0).addressBech32Testnet;
  } else if (format === "sango-legacy") {
    const w = wallet as Wallet;
    sangoAddress = w.identity.addressBech32;
  }

  const hasAny = evmAddress || btcAddress || sangoAddress;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="size-3" /> Retour
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.receivePage.title}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.receivePage.subtitle}
        </p>
      </header>

      {!hasAny && (
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t.receivePage.empty}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {evmAddress && (
          <ReceiveFamilyCard
            label={t.receivePage.sections.evm}
            networkLabel={t.receivePage.networkLabel.evm}
            address={evmAddress}
            testId="receive-card-evm"
          />
        )}
        {btcAddress && (
          <ReceiveFamilyCard
            label={t.receivePage.sections.bitcoin}
            networkLabel={t.receivePage.networkLabel.bitcoin}
            address={btcAddress}
            testId="receive-card-bitcoin"
          />
        )}
        {sangoAddress && (
          <ReceiveFamilyCard
            label={t.receivePage.sections.sango}
            // Force le suffixe devnet : l'adresse provient de
            // `addressBech32Testnet` — le label doit le refléter.
            networkLabel={`${t.receivePage.networkLabel.sango} (devnet)`}
            address={sangoAddress}
            testId="receive-card-sango"
          />
        )}
      </div>
    </div>
  );
}