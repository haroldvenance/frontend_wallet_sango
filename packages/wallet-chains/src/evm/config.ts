import type { Network } from "../types/network";

/**
 * Configurations des réseaux EVM supportés (E1 + E1.5 + E1.7.b).
 *
 * **D-NET-1 (étendu)** : 6 réseaux en E1.7.b.
 *   - ethereum-sepolia    : testnet de référence (conservé pour les tests)
 *   - ethereum-mainnet    : production
 *   - base                : L2 Coinbase (ETH comme gas token)
 *   - arbitrum-one        : L2 Arbitrum (ETH comme gas token)
 *   - bsc                 : BNB Smart Chain mainnet (BNB comme gas token)
 *   - bsc-testnet         : BNB Smart Chain Chapel (BNB comme gas token)
 *
 * **D-E1.7-2** : `nativeAsset` est un littéral par réseau, jamais une
 * constante partagée. Le gas token de BSC est BNB (18 dec) — traité
 * comme `"bnb"` même sur testnet (pas de "tBNB" : l'`assetId` représente
 * l'asset natif de la chaîne, pas sa variante testnet).
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

// ── BNB Smart Chain (E1.7.b) ─────────────────────────────────

/**
 * BNB Smart Chain mainnet (ex-Binance Smart Chain).
 *
 * **D-E1.7-2** : nativeAsset = "bnb" (18 decimals). RPC endpoints
 * officiels BNB Chain + publicnode (ordre = priorité RpcPool).
 *
 * **Explorer** : BscScan (mêmes paths que Etherscan).
 *
 * **Périmètre E1.7.b** : BNB natif uniquement. Les tokens BEP-20
 * (USDT) arrivent en E1.7.c ; USDC reste hors registre (D-E1.6-7
 * étendue : pas de bridged/non-official token).
 */
export const BNB_SMART_CHAIN_MAINNET: Network = {
  id: "bsc",
  family: "evm",
  name: "BNB Smart Chain",
  chainId: "0x38", // 56
  nativeAsset: "bnb",
  defaultRpcEndpoints: [
    "https://bsc-dataseed.binance.org",
    "https://bsc.publicnode.com",
    "https://bsc-rpc.publicnode.com",
  ],
  explorer: {
    baseUrl: "https://bscscan.com",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

/**
 * BNB Smart Chain testnet (Chapel).
 *
 * **D-E1.7-2** : nativeAsset = "bnb" (pas "tBNB"). L'assetId décrit
 * l'asset natif de la chaîne (BNB), pas sa variante testnet. Sémantique
 * alignée sur `eth` pour Ethereum Sepolia.
 *
 * **Un seul endpoint** : BNB Chain ne publie qu'un seed officiel
 * fiable pour Chapel. Le RpcPool séquentiel n'a rien à fallbacker si
 * cet endpoint tombe — comportement accepté en E1.7.b (le testnet
 * n'est pas critique).
 */
export const BNB_SMART_CHAIN_TESTNET: Network = {
  id: "bsc-testnet",
  family: "evm",
  name: "BNB Smart Chain Testnet",
  chainId: "0x61", // 97
  nativeAsset: "bnb",
  defaultRpcEndpoints: [
    "https://data-seed-prebsc-1-s1.binance.org:8545",
  ],
  explorer: {
    baseUrl: "https://testnet.bscscan.com",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

/**
 * Tous les réseaux EVM supportés, ordonnés par pertinence UX.
 * Le `WalletSessionProvider` enregistre cette liste dans le registry
 * et `EvmNetworkSelector` itère dessus pour l'UI.
 *
 * **Ordre (E1.7.b)** :
 *   Sepolia → Ethereum → Base → Arbitrum One → BSC → BSC Testnet
 *
 * Sepolia reste disponible — nécessaire aux tests E2E et à
 * l'onboarding sans fonds réels. BSC est ajouté en queue pour ne pas
 * réordonner les 4 réseaux existants (compat snapshots / UX stable).
 */
export const ALL_EVM_NETWORKS: readonly Network[] = Object.freeze([
  ETHEREUM_SEPOLIA,
  ETHEREUM_MAINNET,
  BASE,
  ARBITRUM_ONE,
  BNB_SMART_CHAIN_MAINNET,
  BNB_SMART_CHAIN_TESTNET,
]);

/** Raccourci — recherche par id. */
export function evmNetworkById(id: string): Network | undefined {
  return ALL_EVM_NETWORKS.find((n) => n.id === id);
}

/** Réseau EVM par défaut à la création d'un wallet (D-UI-3). */
export const DEFAULT_EVM_NETWORK_ID = "ethereum-sepolia";
