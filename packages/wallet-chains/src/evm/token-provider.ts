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
 * réseau (pas de découverte auto). Les métadonnées `symbol`/`decimals`
 * viennent de la config figée (`EVM_TOKENS`) — pas de `eth_call`
 * supplémentaire.
 *
 * `getTokenBalance(address, token)` : lit `balanceOf(address)` sur le
 * contrat via `eth_call`, décode la réponse `uint256`.
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
        name: cfg.symbol === "USDC" ? "USD Coin" : "Tether USD",
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
}
