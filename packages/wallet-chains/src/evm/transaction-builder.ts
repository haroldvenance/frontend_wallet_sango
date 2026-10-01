import { encodeFunctionData, type Address as ViemAddress } from "viem";

import type {
  SendParams,
  TransactionBuilder,
} from "../capabilities/transaction-builder";
import type { Address, Hash } from "../types/address";
import type {
  TxMeta,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import { ERC20_ABI } from "./erc20-abi";
import type { Eip1559UnsignedFields } from "./eip1559-codec";
import { EVM_NATIVE_ASSET_ID } from "./config";
import type { EvmRpc } from "./rpc";

const BASE_FEE_MULTIPLIER = 2n;

/**
 * Construction d'une tx EIP-1559 EVM.
 *
 * **E1.6** — Supporte maintenant 2 variants :
 *   - `transfer`      : envoi d'ETH natif (`value > 0`, `data` vide).
 *   - `transferErc20` : appel `transfer(address, uint256)` sur un
 *                       contrat ERC-20 (`value = 0`, `data` encodé ABI).
 *
 * Le `TransactionSigner` EVM reste inchangé — il signe n'importe quel
 * `Eip1559UnsignedFields`, que ce soit un transfert natif ou un call.
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
    switch (params.kind) {
      case "transfer":
        return this.#buildTransfer(params, sender);
      case "transferErc20":
        return this.#buildErc20Transfer(params, sender);
      default:
        // Les variants staking (bond, delegate…) sont SANGO-spécifiques.
        // SendParams est une union partagée — on n'en supporte qu'un
        // sous-ensemble côté EVM.
        throw new Error(
          `EvmTransactionBuilder: unsupported send kind "${params.kind}" (EVM supports "transfer" and "transferErc20")`,
        );
    }
  }

  // ── Native ETH ────────────────────────────────────────────

  async #buildTransfer(
    params: Extract<SendParams, { kind: "transfer" }>,
    sender: Address,
  ): Promise<ChainsUnsignedTx> {
    assertNativeEth(params, this.#networkId);

    const [nonce, gasLimit, baseFeePerGas, maxPriorityFeePerGas] =
      await Promise.all([
        this.#rpc.getTransactionCount(sender),
        this.#rpc.estimateGas({
          from: sender,
          to: params.to,
          value: params.amount,
        }),
        this.#rpc.getBaseFeePerGas(),
        this.#rpc.getMaxPriorityFeePerGas(),
      ]);

    const maxFeePerGas =
      baseFeePerGas * BASE_FEE_MULTIPLIER + maxPriorityFeePerGas;

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

  // ── ERC-20 ────────────────────────────────────────────────

  async #buildErc20Transfer(
    params: Extract<SendParams, { kind: "transferErc20" }>,
    sender: Address,
  ): Promise<ChainsUnsignedTx> {
    const contract = assertErc20Token(params, this.#networkId);

    // Encode l'appel `transfer(address,uint256)`.
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [params.to as ViemAddress, params.amount],
    });

    // Nonce + gas + fees (le call peut être plus cher qu'un simple
    // transfert natif : ~45-65k selon le token).
    const [nonce, gasLimit, baseFeePerGas, maxPriorityFeePerGas] =
      await Promise.all([
        this.#rpc.getTransactionCount(sender),
        this.#rpc.estimateGas({
          from: sender,
          to: contract,
          value: 0n,
          data: data as Hash,
        }),
        this.#rpc.getBaseFeePerGas(),
        this.#rpc.getMaxPriorityFeePerGas(),
      ]);

    const maxFeePerGas =
      baseFeePerGas * BASE_FEE_MULTIPLIER + maxPriorityFeePerGas;

    const fields: Eip1559UnsignedFields = {
      chainId: this.#chainId,
      nonce,
      to: contract,
      value: 0n,
      data: data as Hash,
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

function bytesToHex(bytes: Uint8Array): Hash {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s as Hash;
}

function assertNativeEth(
  params: Extract<SendParams, { kind: "transfer" }>,
  networkId: string,
): void {
  if (
    params.assetRef.kind !== "native" ||
    params.assetRef.assetId !== EVM_NATIVE_ASSET_ID
  ) {
    throw new Error(
      "EvmTransactionBuilder: transfer requires a native ETH assetRef",
    );
  }
  if (params.assetRef.networkId !== networkId) {
    throw new Error(
      `EvmTransactionBuilder: network mismatch (expected "${networkId}", got "${params.assetRef.networkId}")`,
    );
  }
}

function assertErc20Token(
  params: Extract<SendParams, { kind: "transferErc20" }>,
  networkId: string,
): Address {
  if (params.assetRef.kind !== "token") {
    throw new Error(
      "EvmTransactionBuilder: transferErc20 requires a token assetRef",
    );
  }
  if (params.assetRef.networkId !== networkId) {
    throw new Error(
      `EvmTransactionBuilder: network mismatch (expected "${networkId}", got "${params.assetRef.networkId}")`,
    );
  }
  return params.assetRef.contract as Address;
}
