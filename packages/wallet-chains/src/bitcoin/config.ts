import type { Network } from "../types/network";

/**
 * Réseaux Bitcoin (E2.1.b).
 *
 * **D-E2.1-2** — Testnet uniquement pour le MVP. Le mainnet sera
 * ajouté dans un patch ultérieur (E2.1.b.7) une fois que le pipeline
 * complet (build → sign → broadcast) est couvert par des fixtures
 * déterministes. Aucun fallback mainnet implicite.
 *
 * **D-E2.1-3** — Bitcoin n'utilise **pas** de `chainId` numérique
 * comme EVM. On expose les magic bytes du réseau (Bitcoin Core
 * `pchMessageStart`) en hex, ce qui identifie le réseau de manière
 * canonique :
 *   - mainnet  : 0xD9B4BEF9
 *   - testnet3 : 0x0709110B
 * Ces valeurs ne sont PAS utilisées par le code wallet — c'est un
 * identifiant lisible, remplaçant un `chainId` EVM qui n'existe pas.
 *
 * **D-E2.1-4** — Un seul backend pour le MVP : mempool.space. Il
 * fournit à la fois les UTXOs (`/api/address/{addr}/utxo`) et les
 * taux de frais (`/api/v1/fees/recommended`). Derrière nos interfaces
 * `UtxoProvider` et `FeeRateProvider` (E2.1.b.2), on pourra ajouter
 * Esplora/Blockstream ou un nœud Core plus tard sans toucher aux
 * wallet-chains.
 */

/**
 * Bitcoin Testnet3 (aussi appelé "testnet" tout court).
 *
 * **nativeAsset = "btc"** : même convention que ETH/BNB (D-E1.7-2) —
 * on identifie l'asset natif de la chaîne, pas sa variante testnet
 * (pas de "tBTC"). Bitcoin a 8 décimales (1 satoshi = 10^-8 BTC).
 */
export const BITCOIN_TESTNET: Network = {
  id: "bitcoin-testnet",
  family: "bitcoin",
  name: "Bitcoin Testnet",
  // Magic bytes testnet3 (Bitcoin Core pchMessageStart).
  chainId: "0x0709110b",
  nativeAsset: "btc",
  isTestnet: true,
  defaultRpcEndpoints: [
    // mempool.space — Esplora REST (pas JSON-RPC). Consommé via
    // l'interface BitcoinRpc (E2.1.b.2), pas directement.
    "https://mempool.space/testnet/api",
  ],
  explorer: {
    baseUrl: "https://mempool.space/testnet",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

/**
 * Tous les réseaux Bitcoin supportés.
 *
 * **D-E2.1-2** — mainnet explicitement absent en E2.1.b. Ajout dans
 * E2.1.b.7 après validation du pipeline testnet.
 */
export const ALL_BITCOIN_NETWORKS: readonly Network[] = Object.freeze([
  BITCOIN_TESTNET,
]);

/** Raccourci — recherche par id. */
export function bitcoinNetworkById(id: string): Network | undefined {
  return ALL_BITCOIN_NETWORKS.find((n) => n.id === id);
}

/** Réseau Bitcoin par défaut (MVP : testnet uniquement). */
export const DEFAULT_BITCOIN_NETWORK_ID = "bitcoin-testnet";
