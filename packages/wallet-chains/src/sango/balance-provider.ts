import type { BalanceProvider } from "../capabilities/balance-provider";
import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { Balance } from "../types/balance";
import { SANGO_DECIMALS, SANGO_NATIVE_ASSET_ID } from "./config";
import type { SangoRpc } from "./rpc";

/**
 * Lecture de solde SANGO natif via `sango_getAccount`.
 *
 * Un compte inexistant est traité comme un solde de 0 (comportement
 * aligné sur le RPC qui renvoie `null`).
 */
export class SangoBalanceProvider implements BalanceProvider {
  readonly #rpc: SangoRpc;
  readonly #networkId: string;

  constructor(rpc: SangoRpc, networkId: string) {
    this.#rpc = rpc;
    this.#networkId = networkId;
  }

  async getBalance(address: Address, assetRef: AssetRef): Promise<Balance> {
    assertNativeSango(assetRef, this.#networkId);

    const account = await this.#rpc.getAccount(address);
    const amount = account ? BigInt(account.balance) : 0n;

    return {
      assetId: SANGO_NATIVE_ASSET_ID,
      networkId: this.#networkId,
      amount,
      decimals: SANGO_DECIMALS,
    };
  }
}

function assertNativeSango(assetRef: AssetRef, networkId: string): void {
  if (assetRef.kind !== "native") {
    throw new Error(
      `SangoBalanceProvider: token assets not supported in V0 (got kind="${assetRef.kind}")`,
    );
  }
  if (assetRef.assetId !== SANGO_NATIVE_ASSET_ID) {
    throw new Error(
      `SangoBalanceProvider: unsupported asset "${assetRef.assetId}" (expected "${SANGO_NATIVE_ASSET_ID}")`,
    );
  }
  if (assetRef.networkId !== networkId) {
    throw new Error(
      `SangoBalanceProvider: network mismatch (expected "${networkId}", got "${assetRef.networkId}")`,
    );
  }
}
