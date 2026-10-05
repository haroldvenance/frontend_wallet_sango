import type { Address } from "../types/address";

/**
 * Tokens ERC-20 officiels supportés en E1.6 (USDC + USDT).
 *
 * **D-E1.6-1** — Registre statique, pas d'import custom, pas de
 * découverte auto. Les adresses sont figées par un test frozen.
 *
 * **Sources** : chaque entrée cite la source d'où l'adresse provient.
 * Toute divergence = bug critique (une adresse erronée peut envoyer
 * des fonds à un contrat inconnu).
 *
 * **Réserves connues** :
 *   - USDT Ethereum/Arbitrum = Tether natif (6 dec).
 *   - USDT BSC = **Binance-Peg BSC-USD** (18 dec, D-E1.7-3). Ce n'est
 *     PAS du Tether natif. `name` reflète le nom affiché sur BscScan.
 *   - USDT non disponible sur Base ni Sepolia (Tether ne déploie pas).
 *   - USDC BSC = **hors registre** (D-E1.6-7 étendue : pas de bridged
 *     ni de Binance-Peg USDC tant qu'une décision produit explicite
 *     n'a pas été prise).
 *   - L'adresse USDT Arbitrum n'est pas listée dans la doc Tether
 *     officielle mais est celle utilisée par tout l'écosystème. À
 *     revérifier trimestriellement.
 */

export type Erc20Symbol = "USDC" | "USDT";

export interface Erc20Config {
  readonly address: Address;
  readonly symbol: Erc20Symbol;
  /**
   * Nom affichable du token.
   *
   * Peut différer du `name()` on-chain : le USDT BSC (Binance-Peg)
   * s'appelle officiellement "Binance-Peg BSC-USD" sur BscScan, même
   * si son `symbol()` est "USDT". On reflète le nom BscScan pour ne
   * pas laisser croire qu'il s'agit du Tether natif (D-E1.7-3).
   */
  readonly name: string;
  /**
   * Decimals du token.
   *
   * **D-E1.7-3** : plus un littéral `6`. USDC et USDT ERC-20 utilisent
   * 6 décimales ; le USDT BEP-20 (BSC) en utilise **18**. Un type
   * `number` empêche le piège du copy-paste ETH → BSC.
   */
  readonly decimals: number;
  /** Source documentaire de l'adresse (URL ou référence). */
  readonly source: string;
}

/**
 * Configuration par networkId → symbol → Erc20Config.
 *
 * Réseaux sans USDT : l'entrée est simplement absente.
 */
export const EVM_TOKENS: Readonly<
  Partial<Record<string, Partial<Record<Erc20Symbol, Erc20Config>>>>
> = Object.freeze({
  "ethereum-mainnet": {
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-main-networks (Ethereum)",
    },
    USDT: {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as Address,
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      source: "https://tether.to/en/supported-protocols (ERC-20 Ethereum)",
    },
  },
  "arbitrum-one": {
    USDC: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-main-networks (Arbitrum)",
    },
    USDT: {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as Address,
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      source: "arbiscan.io/token/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 (à confirmer dans la doc Tether)",
    },
  },
  "base": {
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-main-networks (Base)",
    },
    // USDT absent : Tether ne déploie pas sur Base.
  },
  "ethereum-sepolia": {
    USDC: {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-test-networks (Ethereum Sepolia)",
    },
    // USDT absent : Tether n'a pas de testnet officiel.
  },
  // ── BNB Smart Chain (E1.7.c) ────────────────────────────────
  "bsc": {
    // Binance-Peg BSC-USD : symbole "USDT" on-chain, name "Binance-Peg
    // BSC-USD" sur BscScan. 18 décimales (≠ 6 pour USDT Ethereum/
    // Arbitrum) — D-E1.7-3.
    USDT: {
      address: "0x55d398326f99059fF775485246999027B3197955" as Address,
      symbol: "USDT",
      name: "Binance-Peg BSC-USD",
      decimals: 18,
      source: "https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955 (Binance-Peg BSC-USD)",
    },
    // USDC absent : D-E1.6-7 étendue — pas de bridged/Binance-Peg USDC
    // tant qu'une décision produit explicite n'a pas été prise.
  },
  // "bsc-testnet" : aucun token. Les contrats Chapel n'ont pas encore
  // été vérifiés (D-E1.6-1 étendue) — E1.7.d.
});

/**
 * Retourne la config d'un token sur un réseau, ou `undefined` si
 * le token n'existe pas sur ce réseau.
 */
export function getTokenConfig(
  networkId: string,
  symbol: Erc20Symbol,
): Erc20Config | undefined {
  return EVM_TOKENS[networkId]?.[symbol];
}

/**
 * Liste tous les tokens configurés pour un réseau.
 * Tableau vide si le réseau n'a aucun token.
 */
export function listTokensForNetwork(networkId: string): readonly Erc20Config[] {
  const entry = EVM_TOKENS[networkId];
  if (!entry) return [];
  return Object.values(entry).filter((t): t is Erc20Config => t !== undefined);
}

/**
 * Vrai si le réseau est dans le registre EVM (avec ou sans tokens).
 */
export function isKnownEvmNetwork(networkId: string): boolean {
  return networkId in EVM_TOKENS;
}

/** Constante de parité stablecoin — D-E1.6-1, source explicite. */
export const STABLECOIN_PARITY_USD = 1n;
