import { Wallet } from "@sango/wallet-core";

import { useWalletStore } from "@/stores/wallet-store";

/**
 * Retourne le wallet SANGO legacy (Ed25519) actif, ou `null` si aucun
 * wallet SANGO n'est déverrouillé (cas : BIP-39 EVM, wallet locké).
 *
 * ⚠️ À utiliser uniquement dans les hooks/composants **SANGO-spécifiques**
 *    (bech32m, staking SANGO, faucet SANGO, history SANGO).
 *    Les fonctionnalités multi-chaînes passent par `WalletSession`.
 */
export function useSangoWallet(): Wallet | null {
  const wallet = useWalletStore((s) => s.wallet);
  return wallet instanceof Wallet ? wallet : null;
}
