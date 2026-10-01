import type {
  Address,
  EvmCallParams,
  EvmRpc,
  Hash,
} from "@sango/wallet-chains";

import type { RpcPool } from "../rpc/rpc-pool";

/**
 * Implémentation `EvmRpc` au-dessus du `RpcPool` générique.
 *
 * **D-EVM-1** — la conversion "interface structurelle EvmRpc (7
 * méthodes) → JSON-RPC EVM" vit ici, pas dans `wallet-chains`.
 *
 * Conversions :
 *   - `eth_chainId`                : hex → number
 *   - `eth_getBalance`             : hex → bigint (wei)
 *   - `eth_getTransactionCount`    : hex → number
 *   - `eth_estimateGas`            : hex → bigint
 *   - `eth_getBlockByNumber(latest)`: extraction baseFeePerGas → bigint
 *   - `eth_maxPriorityFeePerGas`   : hex → bigint
 *   - `eth_sendRawTransaction`     : passthrough (hash)
 *
 * Toutes les méthodes utilisent le pool : fallback automatique sur
 * erreur d'endpoint (D-RPC-2).
 */
export class EvmRpcUsingPool implements EvmRpc {
  readonly #pool: RpcPool;
  readonly #networkId: string;

  constructor(pool: RpcPool, networkId: string) {
    this.#pool = pool;
    this.#networkId = networkId;
  }

  // ── Lecture (patch 2) ─────────────────────────────────────

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

  // ── EIP-1559 + broadcast (patch 4) ────────────────────────

  async estimateGas(tx: EvmCallParams): Promise<bigint> {
    const callObj: Record<string, unknown> = { from: tx.from };
    if (tx.to !== undefined) callObj.to = tx.to;
    if (tx.value !== undefined) callObj.value = "0x" + tx.value.toString(16);
    if (tx.data !== undefined) callObj.data = tx.data;

    const hex = await this.#pool.request<string>(
      this.#networkId,
      "eth_estimateGas",
      [callObj],
    );
    return hexToBigInt(hex, "eth_estimateGas");
  }

  async getBaseFeePerGas(): Promise<bigint> {
    const block = await this.#pool.request<{
      readonly baseFeePerGas?: string;
    } | null>(
      this.#networkId,
      "eth_getBlockByNumber",
      ["latest", false],
    );
    if (!block || !block.baseFeePerGas) {
      throw new Error(
        "EvmRpcUsingPool.getBaseFeePerGas: missing baseFeePerGas in block (pre-London chain?)",
      );
    }
    return hexToBigInt(block.baseFeePerGas, "baseFeePerGas");
  }

  async getMaxPriorityFeePerGas(): Promise<bigint> {
    const hex = await this.#pool.request<string>(
      this.#networkId,
      "eth_maxPriorityFeePerGas",
      [],
    );
    return hexToBigInt(hex, "eth_maxPriorityFeePerGas");
  }

  async sendRawTransaction(raw: Hash): Promise<Hash> {
    const hash = await this.#pool.request<string>(
      this.#networkId,
      "eth_sendRawTransaction",
      [raw],
    );
    if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      throw new Error(
        `EvmRpcUsingPool.sendRawTransaction: expected 32-byte hex hash, got ${String(hash)}`,
      );
    }
    return hash as Hash;
  }

  // ── E1.6 : eth_call ───────────────────────────────────────

  async call(tx: EvmCallParams): Promise<string> {
    const callObj: Record<string, unknown> = { from: tx.from };
    if (tx.to !== undefined) callObj.to = tx.to;
    if (tx.value !== undefined) callObj.value = "0x" + tx.value.toString(16);
    if (tx.data !== undefined) callObj.data = tx.data;

    const result = await this.#pool.request<string>(
      this.#networkId,
      "eth_call",
      [callObj, "latest"],
    );

    // `eth_call` retourne toujours une string hex. On vérifie le
    // préfixe pour détecter un RPC malformé. Pas de check de longueur
    // (une fonction ABI peut retourner 0, 32, ou N bytes).
    if (typeof result !== "string" || !/^0x[0-9a-fA-F]*$/.test(result)) {
      throw new Error(
        `EvmRpcUsingPool.call: expected hex string, got ${String(result)}`,
      );
    }
    return result;
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
