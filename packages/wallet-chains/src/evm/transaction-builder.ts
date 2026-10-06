import { encodeFunctionData, type Address as ViemAddress } from "viem";

import type {
  SendParams,
  TransactionBuilder,
} from "../capabilities/transaction-builder";
import type { Address, Hash } from "../types/address";
import type { AssetRef } from "../types/asset";
import type {
  TxMeta,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import { ERC20_ABI } from "./erc20-abi";
import { MAX_UINT256 } from "./tokens";
import type { Eip1559UnsignedFields } from "./eip1559-codec";
import type { EvmRpc } from "./rpc";

const BASE_FEE_MULTIPLIER = 2n;

/**
 * Construction d'une tx EIP-1559 EVM.
 *
 * **E2.2.a.2** — Supporte 3 variants :
 *   - `transfer`      : envoi natif (`value > 0`, `data` vide).
 *   - `transferErc20` : appel `transfer(address, uint256)` sur un
 *                       contrat ERC-20 (`value = 0`, `data` encodé ABI).
 *   - `approveErc20`  : appel `approve(address, uint256)` sur un
 *                       contrat ERC-20 (`value = 0`, `data` encodé ABI).
 *
 * Le `TransactionSigner` EVM reste inchangé — il signe n'importe quel
 * `Eip1559UnsignedFields`, que ce soit un transfert natif ou un call.
 */
export class EvmTransactionBuilder implements TransactionBuilder {
  readonly #rpc: EvmRpc;
  readonly #networkId: string;
  readonly #chainId: number;
  readonly #nativeAsset: string;

  constructor(
    rpc: EvmRpc,
    networkId: string,
    chainId: number,
    nativeAsset: string,
  ) {
    this.#rpc = rpc;
    this.#networkId = networkId;
    this.#chainId = chainId;
    this.#nativeAsset = nativeAsset;
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
      case "approveErc20":
        return this.#buildErc20Approve(params, sender);
      case "transferBitcoin":
        // E2.1.b.3 — Bitcoin-only. Le pipeline EVM n'a pas d'UTXOs.
        throw new Error(
          "EvmTransactionBuilder: transferBitcoin is Bitcoin-only and not supported on EVM",
        );
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
    assertNative(params, this.#networkId, this.#nativeAsset);

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
    const contract = assertErc20Token(params, this.#networkId, "transferErc20");

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

  // ── ERC-20 approve (E2.2.a.2) ─────────────────────────────

  async #buildErc20Approve(
    params: Extract<SendParams, { kind: "approveErc20" }>,
    sender: Address,
  ): Promise<ChainsUnsignedTx> {
    // 1. Validation assetRef + réseau.
    const contract = assertErc20Token(params, this.#networkId, "approveErc20");

    // 2. `token` doit être identique à `assetRef.contract`. Le variant
    //    porte les deux, une divergence signale un bug appelant.
    if (params.token !== contract) {
      throw new Error(
        `EvmTransactionBuilder: approveErc20 token/assetRef mismatch ` +
          `(token="${params.token}", assetRef.contract="${contract}")`,
      );
    }

    // 3. Bornes uint256 (0n accepté → revoke, MAX_UINT256 → unlimited).
    assertUint256Amount(params.amount);

    // 4. Encode l'appel `approve(address,uint256)`.
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [params.spender as ViemAddress, params.amount],
    });

    // 5. Nonce + gas + fees (le call peut être plus cher qu'un transfer).
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

    // `meta.to` = spender (destinataire sémantique de l'autorisation).
    const meta: TxMeta = {
      from: sender,
      to: params.spender,
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

function assertNative(
  params: Extract<SendParams, { kind: "transfer" }>,
  networkId: string,
  nativeAsset: string,
): void {
  if (
    params.assetRef.kind !== "native" ||
    params.assetRef.assetId !== nativeAsset
  ) {
    throw new Error(
      "EvmTransactionBuilder: transfer requires a native assetRef",
    );
  }
  if (params.assetRef.networkId !== networkId) {
    throw new Error(
      `EvmTransactionBuilder: network mismatch (expected "${networkId}", got "${params.assetRef.networkId}")`,
    );
  }
}

/**
 * Valide un assetRef de type token ERC-20 + cohérence réseau.
 *
 * `context` est utilisé dans le message d'erreur ("transferErc20" /
 * "approveErc20") — les tests peuvent matcher la sous-chaîne
 * `/requires a token assetRef/` indifféremment du variant.
 */
function assertErc20Token(
  params: { readonly assetRef: AssetRef },
  networkId: string,
  context: string,
): Address {
  if (params.assetRef.kind !== "token") {
    throw new Error(
      `EvmTransactionBuilder: ${context} requires a token assetRef`,
    );
  }
  if (params.assetRef.networkId !== networkId) {
    throw new Error(
      `EvmTransactionBuilder: network mismatch (expected "${networkId}", got "${params.assetRef.networkId}")`,
    );
  }
  return params.assetRef.contract as Address;
}

/**
 * Valide qu'un montant ERC-20 tient dans un `uint256` non signé.
 *
 * `bigint` peut être négatif ou dépasser `2^256 - 1` — le builder doit
 * refuser ces cas avant l'encodage ABI (qui produirait un revert
 * silencieux côté contrat, ou pire, un cast tronqué).
 */
function assertUint256Amount(amount: bigint): void {
  if (amount < 0n) {
    throw new Error(
      `EvmTransactionBuilder: approveErc20 amount must be >= 0 (got ${amount})`,
    );
  }
  if (amount > MAX_UINT256) {
    throw new Error(
      `EvmTransactionBuilder: approveErc20 amount exceeds uint256 max (got ${amount})`,
    );
  }
}
