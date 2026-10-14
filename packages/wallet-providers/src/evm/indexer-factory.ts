import type { EvmIndexer } from "@sango/wallet-chains";

import { EtherscanIndexer } from "./etherscan-indexer";

/**
 * Fabrique d'`EvmIndexer` par réseau — Phase 9.5.b.
 *
 * **Problème résolu** : Etherscan V2 free tier ne couvre pas BSC ni
 * Base, ce qui rendait l'historique de ces réseaux indisponible.
 * Routescan expose une API **compatible Etherscan** pour ces chaînes,
 * sans clé obligatoire.
 *
 * Stratégie :
 *   1. Etherscan V2 (clé requise) — Ethereum, Sepolia, Arbitrum One.
 *   2. Routescan (pas de clé) — BSC, Base.
 *   3. `undefined` — réseau non couvert.
 */

const ETHERSCAN_V2_CHAIN_IDS = new Set<number>([
  1,        // Ethereum mainnet
  11155111, // Sepolia
  42161,    // Arbitrum One
]);

const ROUTESCAN_BASE_URLS: Record<number, string> = {
  56:   "https://api.routescan.io/v2/network/mainnet/evm/56/etherscan/api",
  8453: "https://api.routescan.io/v2/network/mainnet/evm/8453/etherscan/api",
};

export interface CreateEvmIndexerOptions {
  readonly chainId: number;
  readonly etherscanApiKey?: string;
}

export function createEvmIndexer(
  opts: CreateEvmIndexerOptions,
): EvmIndexer | undefined {
  // 1. Etherscan V2 (clé requise).
  if (opts.etherscanApiKey && ETHERSCAN_V2_CHAIN_IDS.has(opts.chainId)) {
    return new EtherscanIndexer({
      apiKey: opts.etherscanApiKey,
      chainId: opts.chainId,
    });
  }

  // 2. Routescan (pas de clé).
  const routescanUrl = ROUTESCAN_BASE_URLS[opts.chainId];
  if (routescanUrl) {
    return new EtherscanIndexer({
      apiKey: "",
      chainId: opts.chainId,
      baseUrl: routescanUrl,
    });
  }

  // 3. Aucun indexer.
  return undefined;
}
