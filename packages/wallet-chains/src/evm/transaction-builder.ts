import type {
  SendParams,
  TransactionBuilder,
} from "../capabilities/transaction-builder";
import type { Address } from "../types/address";
import type {
  TxMeta,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import { EVM_NATIVE_ASSET_ID } from "./config";
import type { Eip1559UnsignedFields } from "./eip1559-codec";
import type { EvmRpc } from "./rpc";

const BASE_FEE_MULTIPLIER = 2n;

/**
 * Construction d'une tx EIP-1559 EVM.
 *
 * V0.4 : seul `kind: "transfer"` est supporté. Le payload est un
 * `Eip1559UnsignedFields` — c'est le `TransactionSigner` EVM qui le
 * consomme pour produire les bytes RLP signés.
 *
 * Pipeline :
 *   1. Récupérer nonce (compteur de txs sortantes).
 *   2. `eth_estimateGas` pour la gasLimit.
 *   3. Base fee + tip → maxFeePerGas.
 *   4. Assembler `Eip1559UnsignedFields`.
 */
export class EvmTransactionBuilder implements TransactionBuilder {
  readonly #rpc: EvmRpc;
  readonly #networkId: string;
  readonly #chainId: number;

  constructor(rpc: EvmRpc, networkId: string, chainId: number) {
    this.#rpc = rpc;
    this.#networkId = networkId;
    this.#chainId = chainId;
  }

  async build(
    params: SendParams,
    sender: Address,
  ): Promise<ChainsUnsignedTx> {
    assertNativeEth(params, this.#networkId);

    switch (params.kind) {
      case "transfer":
        return this.#buildTransfer(params, sender);
      default:
        // E1 supporte uniquement "transfer" (EIP-1559). Les variants
        // staking (bond, delegate…) sont SANGO-spécifiques (V0.2) —
        // EVM n'a pas de staking en E1.
        // Pas d'exhaustive check : SendParams est une union partagée
        // (9 variants), on en supporte volontairement un seul.
        throw new Error(
          `EvmTransactionBuilder: unsupported send kind "${params.kind}" (only "transfer" supported in E1)`,
        );
    }
  }

  async #buildTransfer(
    params: Extract<SendParams, { kind: "transfer" }>,
    sender: Address,
  ): Promise<ChainsUnsignedTx> {
    // 1. Nonce.
    const nonce = await this.#rpc.getTransactionCount(sender);

    // 2. Gas + fees en parallèle (indépendants).
    const [gasLimit, baseFeePerGas, maxPriorityFeePerGas] = await Promise.all([
      this.#rpc.estimateGas({
        from: sender,
        to: params.to,
        value: params.amount,
      }),
      this.#rpc.getBaseFeePerGas(),
      this.#rpc.getMaxPriorityFeePerGas(),
    ]);

    const maxFeePerGas = baseFeePerGas * BASE_FEE_MULTIPLIER + maxPriorityFeePerGas;

    const fields: Eip1559UnsignedFields = {
      chainId: this.#chainId,
      nonce,
      to: params.to,
      value: params.amount,
      data: params.memo ? bytesToHex(params.memo) : undefined,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };

    const meta: TxMeta = {
      from: sender,
      to: params.to,
      assetRef: params.assetRef,
      amount: params.amount,
    };

    return {
      family: "evm",
      networkId: this.#networkId,
      payload: fields,
      meta,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s as `0x${string}`;
}

function assertNativeEth(params: SendParams, networkId: string): void {
  if (
    params.assetRef.kind !== "native" ||
    params.assetRef.assetId !== EVM_NATIVE_ASSET_ID
  ) {
    throw new Error(
      "EvmTransactionBuilder: only native ETH supported in E1",
    );
  }
  if (params.assetRef.networkId !== networkId) {
    throw new Error(
      `EvmTransactionBuilder: network mismatch (expected "${networkId}")`,
    );
  }
}
