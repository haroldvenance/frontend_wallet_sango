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
 *   - USDT n'est disponible que sur Ethereum et Arbitrum (Tether ne
 *     déploie pas sur Base ni Sepolia).
 *   - L'adresse USDT Arbitrum n'est pas listée dans la doc Tether
 *     officielle mais est celle utilisée par tout l'écosystème. À
 *     revérifier trimestriellement.
 */

export type Erc20Symbol = "USDC" | "USDT";

export interface Erc20Config {
  readonly address: Address;
  readonly symbol: Erc20Symbol;
  /** USDC et USDT utilisent 6 décimales. */
  readonly decimals: 6;
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
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-main-networks (Ethereum)",
    },
    USDT: {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as Address,
      symbol: "USDT",
      decimals: 6,
      source: "https://tether.to/en/supported-protocols (ERC-20 Ethereum)",
    },
  },
  "arbitrum-one": {
    USDC: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address,
      symbol: "USDC",
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-main-networks (Arbitrum)",
    },
    USDT: {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as Address,
      symbol: "USDT",
      decimals: 6,
      source: "arbiscan.io/token/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 (à confirmer dans la doc Tether)",
    },
  },
  "base": {
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
      symbol: "USDC",
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-main-networks (Base)",
    },
    // USDT absent : Tether ne déploie pas sur Base.
  },
  "ethereum-sepolia": {
    USDC: {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address,
      symbol: "USDC",
      decimals: 6,
      source: "https://developers.circle.com/stablecoins/docs/usdc-on-test-networks (Ethereum Sepolia)",
    },
    // USDT absent : Tether n'a pas de testnet officiel.
  },
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
