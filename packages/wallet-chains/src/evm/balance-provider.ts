import type { BalanceProvider } from "../capabilities/balance-provider";
import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { Balance } from "../types/balance";
import { EVM_NATIVE_DECIMALS } from "./config";
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
  readonly #nativeAsset: string;

  constructor(rpc: EvmRpc, networkId: string, nativeAsset: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
    this.#nativeAsset = nativeAsset;
  }

  async getBalance(address: Address, assetRef: AssetRef): Promise<Balance> {
    assertNative(assetRef, this.#networkId, this.#nativeAsset);
    const amount = await this.#rpc.getBalance(address);
    return {
      assetId: this.#nativeAsset,
      networkId: this.#networkId,
      amount,
      decimals: EVM_NATIVE_DECIMALS,
    };
  }
}

function assertNative(
  assetRef: AssetRef,
  networkId: string,
  nativeAsset: string,
): void {
  if (assetRef.kind !== "native") {
    throw new Error(
      `EvmBalanceProvider: token assets not supported (got kind="${assetRef.kind}")`,
    );
  }
  if (assetRef.assetId !== nativeAsset) {
    throw new Error(
      `EvmBalanceProvider: unsupported asset "${assetRef.assetId}" (expected "${nativeAsset}")`,
    );
  }
  if (assetRef.networkId !== networkId) {
    throw new Error(
      `EvmBalanceProvider: network mismatch (expected "${networkId}", got "${assetRef.networkId}")`,
    );
  }
}
