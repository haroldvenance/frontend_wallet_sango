import type { Wallet } from "@sango/wallet-core";

import { useWalletStore } from "@/stores/wallet-store";

/**
 * Retourne le wallet SANGO legacy (Ed25519) actif, ou `null` si aucun
 * wallet SANGO n'est déverrouillé (cas : BIP-39 EVM, wallet locké).
 *
 * ⚠️ À utiliser uniquement dans les hooks/composants **SANGO-spécifiques**
 *    (bech32m, staking SANGO, faucet SANGO, history SANGO).
 *    Les fonctionnalités multi-chaînes passent par `WalletSession`.
 *
 * **D-Phase3-5** — le test d'appartenance utilise `format` (source de
 * vérité du store) plutôt que `instanceof Wallet`. Raison :
 *   - `format === "sango-legacy"` est garanti cohérent avec `wallet`
 *     par les invariants du store (`unlock` / `switchWallet`) ;
 *   - `instanceof` est fragile (duals modules, mocks, casts de test) ;
 *   - le cast reste sûr par construction.
 */
export function useSangoWallet(): Wallet | null {
  const wallet = useWalletStore((s) => s.wallet);
  const format = useWalletStore((s) => s.format);
  if (format !== "sango-legacy" || !wallet) return null;
  return wallet as Wallet;
}
