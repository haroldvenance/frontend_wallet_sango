import type { Address } from "../types/address";
import type { Token } from "../types/token";

/**
 * Capacité optionnelle : découverte et lecture de tokens.
 *
 * Absente en V0 pour SANGO natif.
 */
export interface TokenProvider {
  listTokens(networkId: string): Promise<readonly Token[]>;
  getTokenBalance(address: Address, token: Token): Promise<bigint>;
}
