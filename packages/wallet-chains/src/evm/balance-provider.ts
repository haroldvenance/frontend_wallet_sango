import type { BalanceProvider } from "../capabilities/balance-provider";
import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { Balance } from "../types/balance";
import { EVM_DECIMALS, EVM_NATIVE_ASSET_ID } from "./config";
import type { EvmRpc } from "./rpc";

/**
 * Lecture de solde EVM natif (wei).
 *
 * Un compte inexistant est traité comme un solde de 0 (comportement
 * aligné sur le RPC : `eth_getBalance` retourne 0n pour une adresse
 * inconnue).
 */
export class EvmBalanceProvider implements BalanceProvider {
  readonly #rpc: EvmRpc;
  readonly #networkId: string;

  constructor(rpc: EvmRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async getBalance(address: Address, assetRef: AssetRef): Promise<Balance> {
    assertNativeEth(assetRef, this.#networkId);
    const amount = await this.#rpc.getBalance(address);
    return {
      assetId: EVM_NATIVE_ASSET_ID,
      networkId: this.#networkId,
      amount,
      decimals: EVM_DECIMALS,
    };
  }
}

function assertNativeEth(assetRef: AssetRef, networkId: string): void {
  if (assetRef.kind !== "native") {
    throw new Error(
      `EvmBalanceProvider: token assets not supported in E1 (got kind="${assetRef.kind}")`,
    );
  }
  if (assetRef.assetId !== EVM_NATIVE_ASSET_ID) {
    throw new Error(
      `EvmBalanceProvider: unsupported asset "${assetRef.assetId}" (expected "${EVM_NATIVE_ASSET_ID}")`,
    );
  }
  if (assetRef.networkId !== networkId) {
    throw new Error(
      `EvmBalanceProvider: network mismatch (expected "${networkId}", got "${assetRef.networkId}")`,
    );
  }
}
