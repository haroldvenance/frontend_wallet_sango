import type { Address } from "../types/address";
import type { Token } from "../types/token";

/**
 * Capacité optionnelle : découverte et lecture de tokens.
 *
 * Absente en V0 pour SANGO natif.
 */
export interface TokenProvider {
  listTokens(networkId: string): Promise<readonly Token[]>;

  /**
   * Solde du token pour une adresse (base units).
   *
   * Voir `Token.metadata.decimals` pour la conversion en unités
   * humaines.
   */
  getTokenBalance(address: Address, token: Token): Promise<bigint>;

  /**
   * Allowance ERC-20 accordée par `owner` à `spender` sur `token`
   * (base units).
   *
   * **E2.2.a.1** — lecture `allowance(address,address)` :
   *   - `0n` → aucune autorisation
   *   - `MAX_UINT256` → autorisation illimitée
   *   - `token.networkId` doit correspondre au `networkId` du
   *     provider, sinon erreur explicite (évite les lectures
   *     cross-chain silencieuses).
   *
   * Aucune action wallet : c'est une lecture de contrat en
   * `eth_call`. La modification (`approve`) passe par
   * `SendParams.approveErc20` (E2.2.a.2).
   */
  getAllowance(
    owner: Address,
    spender: Address,
    token: Token,
  ): Promise<bigint>;
}
