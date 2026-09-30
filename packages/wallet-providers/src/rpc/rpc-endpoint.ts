/**
 * Endpoint RPC — URL + priorité optionnelle.
 *
 * **D-RPC-2** — abstraction générique, sans référence au protocole
 * JSON-RPC. Le pool trie par `priority` croissante (plus petit =
 * plus prioritaire). Absente = priorité 0.
 */
export interface RpcEndpoint {
  readonly url: string;
  readonly priority?: number;
}

/**
 * Retourne une copie triée par `priority` croissante.
 *
 * Ne mute PAS le tableau d'entrée — important car le pool conserve
 * l'ordre enregistré (pas de mutation après un échec, D-RPC-2 minimal).
 */
export function sortEndpointsByPriority(
  endpoints: readonly RpcEndpoint[],
): readonly RpcEndpoint[] {
  return [...endpoints].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );
}
