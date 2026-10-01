import { BalanceCardEvm } from "./balance-card-evm";

/**
 * Dashboard EVM (E1) — volontairement minimal.
 *
 * Affiche :
 *   - BalanceCardEvm : adresse + solde ETH natif + nonce.
 *
 * Pas encore (E1.5+) :
 *   - envoi ETH (nécessite un formulaire + estimation de frais)
 *   - historique (nécessite un indexeur EVM)
 *   - tokens ERC-20
 *   - staking
 *
 * Le dashboard SANGO reste inchangé — c'est un dispatch dans `App.tsx`
 * qui choisit entre les deux selon `wallet-store.format`.
 */
export function EvmDashboard() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Wallet Ethereum · réseau de test
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
      </div>
      <div className="space-y-8">
        <BalanceCardEvm />
      </div>
    </div>
  );
}
