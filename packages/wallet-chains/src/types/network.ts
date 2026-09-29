import type { ChainFamily } from "./chain";
import type { AssetId } from "./asset";

/**
 * Configuration d'explorer externe pour un réseau.
 */
export interface ExplorerConfig {
  readonly baseUrl: string;
  /** Template d'URL pour une tx. Ex. `"/tx/{hash}"`. */
  readonly txPath: string;
  /** Template d'URL pour une adresse. Ex. `"/address/{addr}"`. */
  readonly addressPath: string;
}

/**
 * Instance concrète d'une chaîne.
 */
export interface Network {
  readonly id: string;
  readonly family: ChainFamily;
  readonly name: string;
  readonly chainId: string;
  readonly nativeAsset: AssetId;
  readonly defaultRpcEndpoints: readonly string[];
  readonly explorer?: ExplorerConfig;
}
