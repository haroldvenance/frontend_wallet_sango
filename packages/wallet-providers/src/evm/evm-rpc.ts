import type { Address, EvmRpc } from "@sango/wallet-chains";

import type { RpcPool } from "../rpc/rpc-pool";

/**
 * Implémentation `EvmRpc` au-dessus du `RpcPool` générique.
 *
 * **D-EVM-1** — la conversion "interface structurelle EvmRpc (3
 * méthodes en patch 2) → JSON-RPC EVM" vit ici, pas dans
 * `wallet-chains` (qui ne connaît ni `RpcPool` ni le protocole).
 *
 * Conversions :
 *   - `eth_chainId`            : hex → number
 *   - `eth_getBalance`         : hex → bigint (wei)
 *   - `eth_getTransactionCount`: hex → number
 *
 * Paramètres conformes au protocole EVM :
 *   - `eth_getBalance(address, "latest")`
 *   - `eth_getTransactionCount(address, "latest")`
 */
export class EvmRpcUsingPool implements EvmRpc {
  readonly #pool: RpcPool;
  readonly #networkId: string;

  constructor(pool: RpcPool, networkId: string) {
    this.#pool = pool;
    this.#networkId = networkId;
  }

  async getChainId(): Promise<number> {
    const hex = await this.#pool.request<string>(
      this.#networkId,
      "eth_chainId",
      [],
    );
    return hexToNumber(hex, "eth_chainId");
  }

  async getBalance(address: Address): Promise<bigint> {
    const hex = await this.#pool.request<string>(
      this.#networkId,
      "eth_getBalance",
      [address, "latest"],
    );
    return hexToBigInt(hex, "eth_getBalance");
  }

  async getTransactionCount(address: Address): Promise<number> {
    const hex = await this.#pool.request<string>(
      this.#networkId,
      "eth_getTransactionCount",
      [address, "latest"],
    );
    return hexToNumber(hex, "eth_getTransactionCount");
  }
}

// ── Conversions hex strictes ────────────────────────────────

function hexToNumber(hex: unknown, ctx: string): number {
  if (typeof hex !== "string" || !/^0x[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`${ctx}: expected hex string, got ${String(hex)}`);
  }
  const n = Number.parseInt(hex, 16);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`${ctx}: hex value exceeds safe integer range: ${hex}`);
  }
  return n;
}

function hexToBigInt(hex: unknown, ctx: string): bigint {
  if (typeof hex !== "string" || !/^0x[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`${ctx}: expected hex string, got ${String(hex)}`);
  }
  return BigInt(hex);
}
