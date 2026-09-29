/**
 * Construit une queryKey React Query qui contient **toujours** :
 *   - le suffixe de base (ex. `["account"]`)
 *   - l'endpoint RPC courant
 *   - le `networkId` métier (ex. `"sango-devnet"`)
 *   - les paramètres additionnels (ex. `address`, `limit`, …)
 *
 * D-UI-1 — Convention : toute query dont la réponse dépend du réseau
 * doit passer par ce helper. Cela garantit l'invalidation croisée :
 *
 *   - changement d'endpoint  → invalide toutes les queries
 *   - changement de networkId → invalide toutes les queries
 *
 * Exemples :
 *   networkQueryKey(["account"], "http://x", "sango-devnet", "0xabc")
 *     → ["account", "http://x", "sango-devnet", "0xabc"]
 *
 *   networkQueryKey(["chain-info"], "http://x", "sango-devnet")
 *     → ["chain-info", "http://x", "sango-devnet"]
 */
export function networkQueryKey(
  base: readonly unknown[],
  endpoint: string,
  networkId: string,
  ...extra: readonly unknown[]
): readonly unknown[] {
  return [...base, endpoint, networkId, ...extra];
}
