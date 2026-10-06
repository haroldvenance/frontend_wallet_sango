import { decodeFunctionResult, encodeFunctionData, type Address as ViemAddress } from "viem";

import type { TokenProvider } from "../capabilities/token-provider";
import type { Address } from "../types/address";
import type { Token } from "../types/token";
import { ERC20_ABI } from "./erc20-abi";
import type { EvmRpc } from "./rpc";
import { listTokensForNetwork } from "./tokens";

/**
 * Lecture ERC-20 côté EVM (D-E1.6-1).
 *
 * `listTokens(networkId)` : retourne les tokens **configurés** pour ce
 * réseau (pas de découverte auto). Les métadonnées
 * `name`/`symbol`/`decimals` viennent de la config figée (`EVM_TOKENS`)
 * — pas de `eth_call` supplémentaire.
 *
 * `getTokenBalance(address, token)` : lit `balanceOf(address)` sur le
 * contrat via `eth_call`, décode la réponse `uint256`.
 *
 * `getAllowance(owner, spender, token)` : lit `allowance(address,
 * address)` sur le contrat via `eth_call` (E2.2.a.1).
 *
 * **Pas de listTokens dynamique** — un token inconnu (pas dans
 * `EVM_TOKENS`) n'est pas accessible. C'est une décision de sécurité
 * (D-E1.6-1) et de scope.
 */
export class EvmTokenProvider implements TokenProvider {
  readonly #rpc: EvmRpc;
  readonly #networkId: string;

  constructor(rpc: EvmRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async listTokens(networkId: string): Promise<readonly Token[]> {
    if (networkId !== this.#networkId) {
      // Un provider est lié à un networkId. On refuse un autre réseau
      // plutôt que de retourner des résultats incohérents.
      return [];
    }
    return listTokensForNetwork(networkId).map((cfg) => ({
      networkId,
      contract: cfg.address,
      assetId: cfg.symbol.toLowerCase(),
      metadata: {
        // `name` vient de la config (D-E1.7-3) — plus de hardcode
        // symbol→name dans le provider.
        name: cfg.name,
        symbol: cfg.symbol,
        decimals: cfg.decimals,
      },
    }));
  }

  async getTokenBalance(address: Address, token: Token): Promise<bigint> {
    if (token.networkId !== this.#networkId) {
      throw new Error(
        `EvmTokenProvider: token network "${token.networkId}" does not match provider network "${this.#networkId}"`,
      );
    }

    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as ViemAddress],
    });

    const result = await this.#rpc.call({
      from: address,
      to: token.contract as Address,
      data,
    });

    // `decodeFunctionResult` retourne un `bigint` pour uint256.
    const balance = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: "balanceOf",
      data: result as `0x${string}`,
    });

    if (typeof balance !== "bigint") {
      throw new Error(
        `EvmTokenProvider: balanceOf returned ${typeof balance}, expected bigint`,
      );
    }
    return balance;
  }

  /**
   * **E2.2.a.1** — `allowance(owner, spender)` via `eth_call`.
   *
   * Selector : `0xdd62ed3e`. Retourne un `uint256` (base units).
   *
   * ⚠️ L'ordre `owner, spender` est **normatif** dans l'ABI ERC-20.
   *    Une inversion produit une lecture silencieusement fausse (les
   *    deux arguments sont des `address`, aucune validation de type ne
   *    détecte l'erreur). Les tests couvrent cette signature.
   */
  async getAllowance(
    owner: Address,
    spender: Address,
    token: Token,
  ): Promise<bigint> {
    if (token.networkId !== this.#networkId) {
      throw new Error(
        `EvmTokenProvider: token network "${token.networkId}" does not match provider network "${this.#networkId}"`,
      );
    }

    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner as ViemAddress, spender as ViemAddress],
    });

    const result = await this.#rpc.call({
      from: owner,
      to: token.contract as Address,
      data,
    });

    const allowance = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: "allowance",
      data: result as `0x${string}`,
    });

    if (typeof allowance !== "bigint") {
      throw new Error(
        `EvmTokenProvider: allowance returned ${typeof allowance}, expected bigint`,
      );
    }
    return allowance;
  }
}
