import type { ChainAdapter } from "./chain-adapter";
import type { ChainFamily } from "../types/chain";
import type { Network } from "../types/network";

/**
 * Fabrique un `ChainAdapter` à partir d'un `Network`.
 *
 * Les dépendances concrètes (RPC client, Signer, explorer…) sont
 * capturées par closure côté appelant. C'est volontaire : tant qu'on a
 * un seul transport (SANGO), il n'y a pas de type `ProviderDeps`
 * générique à inventer.
 *
 * Exemple :
 *   registry.register(
 *     SANGO_DEVNET,
 *     (network) => sangoAdapterFactory(
 *       network as SangoNetwork,
 *       { rpc, signer },
 *     ),
 *   );
 */
export type AdapterFactory = (network: Network) => ChainAdapter;

/**
 * Registre des chaînes disponibles.
 *
 * Le registre est **paresseux** : la factory n'est appelée qu'au
 * premier `get(id)`. Les instances sont mises en cache — un `get()`
 * ultérieur retourne la même instance.
 */
export interface ChainRegistry {
  /**
   * Enregistre un réseau avec sa factory.
   *
   * @throws si `network.id` est déjà enregistré. Pour remplacer,
   *         appeler `unregister(networkId)` d'abord.
   */
  register(network: Network, factory: AdapterFactory): void;

  /**
   * Retourne l'adaptateur du réseau, en l'instanciant au premier
   * appel. `undefined` si le réseau n'est pas enregistré.
   */
  get(networkId: string): ChainAdapter | undefined;

  /** Liste **tous** les réseaux enregistrés (ordre d'enregistrement). */
  list(): readonly Network[];

  /** Filtre par famille. */
  listByFamily(family: ChainFamily): readonly Network[];

  /**
   * Retire un réseau du registre. Les instances déjà créées sont
   * jetées du cache (elles ne sont pas détruites côté ressource).
   */
  unregister(networkId: string): void;
}

/**
 * Implémentation en mémoire. V0 ne nécessite pas de persistance.
 */
export class InMemoryChainRegistry implements ChainRegistry {
  readonly #networks = new Map<string, Network>();
  readonly #factories = new Map<string, AdapterFactory>();
  readonly #adapters = new Map<string, ChainAdapter>();

  register(network: Network, factory: AdapterFactory): void {
    if (this.#networks.has(network.id)) {
      throw new Error(
        `ChainRegistry: network "${network.id}" is already registered`,
      );
    }
    this.#networks.set(network.id, network);
    this.#factories.set(network.id, factory);
  }

  get(networkId: string): ChainAdapter | undefined {
    const cached = this.#adapters.get(networkId);
    if (cached) return cached;

    const factory = this.#factories.get(networkId);
    if (!factory) return undefined;

    const network = this.#networks.get(networkId);
    if (!network) return undefined;

    const adapter = factory(network);
    this.#adapters.set(networkId, adapter);
    return adapter;
  }

  list(): readonly Network[] {
    return Array.from(this.#networks.values());
  }

  listByFamily(family: ChainFamily): readonly Network[] {
    return this.list().filter((n) => n.family === family);
  }

  unregister(networkId: string): void {
    this.#networks.delete(networkId);
    this.#factories.delete(networkId);
    this.#adapters.delete(networkId);
  }
}

/** Raccourci : crée un registre en mémoire vide. */
export function createChainRegistry(): ChainRegistry {
  return new InMemoryChainRegistry();
}
