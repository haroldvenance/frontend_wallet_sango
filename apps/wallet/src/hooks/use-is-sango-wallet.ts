import { useWalletStore } from "@/stores/wallet-store";

/**
 * Vrai si le wallet déverrouillé est SANGO legacy (Ed25519).
 *
 * Utilisé par les hooks SANGO-spécifiques pour désactiver leurs queries
 * (via `enabled: false`) quand un wallet BIP-39 EVM est actif — au lieu
 * de planter au runtime.
 *
 * **D-SIGNER-1** : ce n'est pas un test de compat — c'est un test
 * d'applicabilité. Un hook SANGO-only ne doit pas s'exécuter pour un
 * wallet EVM, il doit rester inactif.
 */
export function useIsSangoWallet(): boolean {
  const format = useWalletStore((s) => s.format);
  return format === "sango-legacy";
}
