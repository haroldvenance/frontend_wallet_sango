import {
  bitcoinNetworkById,
  evmNetworkById,
  type ChainFamily,
} from "@sango/wallet-chains";

/**
 * Résolution canonique `networkId` → `ChainFamily` (E2.1.b.6.1).
 *
 * **D-E2.1-18** — `family` n'est **jamais** un argument fourni par
 * l'UI. Elle est toujours dérivée du `networkId` via cette fonction,
 * qui reste l'unique point de résolution dans l'app.
 *
 * Ordre de résolution :
 *   1. Réseau EVM connu      → `"evm"`
 *   2. Réseau Bitcoin connu  → `"bitcoin"`
 *   3. Tout le reste         → `"sango"` (fallback pour SANGO legacy
 *      + réseau inconnu — voir `isKnownNetworkId` pour les checks
 *      stricts).
 *
 * Le fallback `"sango"` est volontairement lenient : il permet de
 * traiter `"sango-devnet"`, `"sango-testnet"`, `"sango-mainnet"` sans
 * maintenir une liste exhaustive. Les consommateurs qui ont besoin
 * d'un check strict utilisent `isKnownNetworkId` en complément.
 */
export function resolveChainFamily(networkId: string): ChainFamily {
  if (evmNetworkById(networkId)) return "evm";
  if (bitcoinNetworkById(networkId)) return "bitcoin";
  return "sango";
}

/**
 * Vérifie qu'un `networkId` correspond à un réseau effectivement
 * enregistré (EVM, Bitcoin, ou SANGO legacy).
 *
 * Utilisé pour rejeter les préférences de session invalides et
 * détecter les états incohérents (keyring pointant vers un réseau
 * qui n'existe plus dans le registre).
 */
export function isKnownNetworkId(networkId: string): boolean {
  if (evmNetworkById(networkId)) return true;
  if (bitcoinNetworkById(networkId)) return true;
  if (networkId.startsWith("sango-")) return true;
  return false;
}
