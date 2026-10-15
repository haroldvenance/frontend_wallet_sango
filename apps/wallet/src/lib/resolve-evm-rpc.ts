/**
 * **Phase 12-A** — Résolution de l'endpoint EVM effectif.
 *
 * **Source unique de vérité** pour :
 *   - le `RpcPool` (via `build-wallet-session`) ;
 *   - les query keys React Query (`use-network-query-context`,
 *     `use-evm-history`).
 *
 * **Sémantique** :
 *   - Custom présent → **UN SEUL** endpoint, `priority 0`.
 *     Pas de fallback preset : si le custom tombe, l'erreur remonte.
 *     Évite la bascule silencieuse vers un preset non choisi.
 *   - Custom absent → endpoints du registre, priorités préservées.
 */

export interface ResolvedRpcEndpoint {
  readonly url: string;
  readonly priority: number;
}

export function resolveEvmRpcEndpoints(
  networkId: string,
  defaultRpcEndpoints: readonly string[],
  customEndpoints: Readonly<Record<string, string>>,
): readonly ResolvedRpcEndpoint[] {
  const custom = customEndpoints[networkId];
  if (custom) {
    return [{ url: custom, priority: 0 }];
  }
  return defaultRpcEndpoints.map((url, i) => ({ url, priority: i }));
}

/**
 * Version string (pour les query keys React Query).
 * Retourne `""` si rien n'est résolvable — état neutre.
 */
export function resolveEvmRpcEndpoint(
  networkId: string,
  defaultRpcEndpoints: readonly string[] | undefined,
  customEndpoints: Readonly<Record<string, string>>,
): string {
  const custom = customEndpoints[networkId];
  if (custom) return custom;
  return defaultRpcEndpoints?.[0] ?? "";
}
