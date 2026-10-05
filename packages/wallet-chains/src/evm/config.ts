import type { Network } from "../types/network";

/**
 * Configurations des réseaux EVM supportés (E1 + E1.5).
 *
 * **D-NET-1 (étendu)** : 4 réseaux en E1.5.
 *   - ethereum-sepolia  : testnet de référence (conservé pour les tests)
 *   - ethereum-mainnet  : production
 *   - base              : L2 Coinbase (ETH comme gas token)
 *   - arbitrum-one      : L2 Arbitrum (ETH comme gas token)
 *
 * **D-EVM-1** : endpoints publics, sans clé API. Consommés par le
 * `RpcPool` générique — pas d'appel direct dans wallet-chains.
 *
 * **D-RPC-3 (status quo)** : chaque requête essaie les endpoints dans
 * l'ordre de priorité jusqu'au premier succès. Aucun état de santé
 * persistant, pas de round-robin, pas de circuit breaker.
 */

export const EVM_DECIMALS = 18;

// ── Testnet ─────────────────────────────────────────────────

export const ETHEREUM_SEPOLIA: Network = {
  id: "ethereum-sepolia",
  family: "evm",
  name: "Ethereum Sepolia",
  chainId: "0xaa36a7", // 11155111
  nativeAsset: "eth",
  defaultRpcEndpoints: [
    "https://ethereum-sepolia.publicnode.com",
    "https://rpc.sepolia.org",
  ],
  explorer: {
    baseUrl: "https://sepolia.etherscan.io",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

// ── Mainnets ────────────────────────────────────────────────

export const ETHEREUM_MAINNET: Network = {
  id: "ethereum-mainnet",
  family: "evm",
  name: "Ethereum",
  chainId: "0x1", // 1
  nativeAsset: "eth",
  defaultRpcEndpoints: [
    "https://eth.llamarpc.com",
    "https://ethereum-rpc.publicnode.com",
    "https://eth.drpc.org",
  ],
  explorer: {
    baseUrl: "https://etherscan.io",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

export const BASE: Network = {
  id: "base",
  family: "evm",
  name: "Base",
  chainId: "0x2105", // 8453
  nativeAsset: "eth",
  defaultRpcEndpoints: [
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
    "https://base.drpc.org",
  ],
  explorer: {
    baseUrl: "https://basescan.org",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

export const ARBITRUM_ONE: Network = {
  id: "arbitrum-one",
  family: "evm",
  name: "Arbitrum One",
  chainId: "0xa4b1", // 42161
  nativeAsset: "eth",
  defaultRpcEndpoints: [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arbitrum.drpc.org",
  ],
  explorer: {
    baseUrl: "https://arbiscan.io",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

/**
 * Tous les réseaux EVM supportés, ordonnés par pertinence UX.
 * Le `WalletSessionProvider` enregistre cette liste dans le registry.
 *
 * Sepolia reste disponible après l'ajout des mainnets — nécessaire aux
 * tests E2E et à l'onboarding sans fonds réels.
 */
export const ALL_EVM_NETWORKS: readonly Network[] = Object.freeze([
  ETHEREUM_SEPOLIA,
  ETHEREUM_MAINNET,
  BASE,
  ARBITRUM_ONE,
]);

/** Raccourci — recherche par id. */
export function evmNetworkById(id: string): Network | undefined {
  return ALL_EVM_NETWORKS.find((n) => n.id === id);
}

/** Réseau EVM par défaut à la création d'un wallet (D-UI-3). */
export const DEFAULT_EVM_NETWORK_ID = "ethereum-sepolia";
