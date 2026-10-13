import { Bip39Wallet, Wallet } from "@sango/wallet-core";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { ReceiveFamilyCard } from "@/features/receive/receive-family-card";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page `/receive` — Phase 7 (D7-a·A, D7-b·A).
 *
 * **Trois sections** selon les capacités du wallet actif :
 *   - V2 (Bip39Wallet) : EVM + Bitcoin (mainnet) + Sango.
 *   - V1 (Wallet Ed25519) : Sango uniquement.
 *
 * **Invariant D6-c** — les adresses proviennent de la **même
 * identité HD** dérivée dans le contexte courant. Aucune adresse
 * n'est inventée si indisponible (état vide explicite).
 *
 * Pour Bitcoin, on affiche **mainnet** par défaut (Phase 5.5 a
 * retiré testnet de l'UI). L'adresse mainnet est dérivée via
 * `getBitcoinIdentity("mainnet", 0, 0)`.
 *
 * Pour SANGO, seul devnet est déployé (pas de mainnet encore) → on
 * affiche l'adresse bech32m `tsango1…` telle que produite par
 * `getSangoIdentity(0).addressBech32Testnet`.
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
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> {t.receivePage.title}
        </Link>
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t.receivePage.empty}
        </div>
      </div>
    );
  }

  // ── Dérivation des adresses ──────────────────────────
  let evmAddress: string | null = null;
  let btcAddress: string | null = null;
  let sangoAddress: string | null = null;

  // Discriminant = `format` (source de vérité du store), pas
  // `instanceof` — fragile en environnement de test (résolution
  // pnpm des class instances). Cf. D-Phase7 fix.
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
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
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
            networkLabel={t.receivePage.networkLabel.sango}
            address={sangoAddress}
            testId="receive-card-sango"
          />
        )}
      </div>
    </div>
  );
}
