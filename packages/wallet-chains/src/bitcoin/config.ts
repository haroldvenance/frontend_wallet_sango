import type { Network } from "../types/network";

/**
 * Réseaux Bitcoin (E2.1.b).
 *
 * **D-E2.1-2 / D-E2.1-22** — Testnet d'abord (MVP), puis mainnet
 * ajouté en E2.1.b.7 une fois le pipeline testnet validé. Aucun
 * fallback mainnet implicite : chaque réseau est une entrée
 * explicite du registre.
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
 *
 * **Défaut de création** (`DEFAULT_BITCOIN_NETWORK_ID`) — conservé
 * après E2.1.b.7 : onboarding sans fonds réels.
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
 * Bitcoin mainnet.
 *
 * **D-E2.1-22** — mainnet ajouté en E2.1.b.7 après validation du
 * pipeline testnet (E2.1.b.1 → E2.1.b.6.4). Même structure que le
 * testnet : P2WPKH BIP-84, mempool.space, nativeAsset `"btc"`, 8
 * décimales.
 *
 * Différences vs testnet :
 *   - `chainId` : magic bytes mainnet (Bitcoin Core `pchMessageStart`)
 *   - HRP bech32 : `bc` (au lieu de `tb`)
 *   - coinType BIP-44 : `0'` (mainnet) au lieu de `1'` (testnet)
 *   - explorer / RPC : pas de préfixe `/testnet`
 *   - `isTestnet: false`
 *
 * **Attention** : mainnet utilise des fonds réels. Le faucet
 * (`BitcoinFaucetButton`) gate sur `bitcoin-testnet` et ne s'affiche
 * pas ici. `MainnetWarning` s'affiche sur les écrans d'envoi.
 */
export const BITCOIN_MAINNET: Network = {
  id: "bitcoin-mainnet",
  family: "bitcoin",
  name: "Bitcoin",
  // Magic bytes mainnet (Bitcoin Core pchMessageStart).
  chainId: "0xd9b4bef9",
  nativeAsset: "btc",
  isTestnet: false,
  defaultRpcEndpoints: [
    "https://mempool.space/api",
  ],
  explorer: {
    baseUrl: "https://mempool.space",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

/**
 * Tous les réseaux Bitcoin supportés.
 *
 * **Ordre (E2.1.b.7)** : Testnet → Mainnet. Cohérent avec EVM
 * (Sepolia en premier). Testnet reste le défaut de création pour
 * l'instant (`DEFAULT_BITCOIN_NETWORK_ID` inchangé).
 */
export const ALL_BITCOIN_NETWORKS: readonly Network[] = Object.freeze([
  BITCOIN_TESTNET,
  BITCOIN_MAINNET,
]);

/** Raccourci — recherche par id. */
export function bitcoinNetworkById(id: string): Network | undefined {
  return ALL_BITCOIN_NETWORKS.find((n) => n.id === id);
}

/** Réseau Bitcoin par défaut (MVP : testnet uniquement). */
export const DEFAULT_BITCOIN_NETWORK_ID = "bitcoin-testnet";
