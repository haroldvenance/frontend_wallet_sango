import {
  TX_KIND,
  decodeNativeAddress,
  type UnsignedTransaction as WalletCoreUnsignedTx,
} from "@sango/wallet-core";

import type {
  SendParams,
  TransactionBuilder,
} from "../capabilities/transaction-builder";
import type { Address } from "../types/address";
import type {
  TxMeta,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import { SANGO_NATIVE_ASSET_ID } from "./config";
import { bytesToHex, hexToBytes } from "./hex";
import type { SangoRpc } from "./rpc";

const SANGO_TX_VERSION = 1;
const DEFAULT_GAS_LIMIT = 21_000n;
const DEFAULT_PRIORITY_FEE = 0n;

/**
 * Multiplicateur appliqué à `baseFee` pour obtenir `maxFee`.
 * Recommandation doc backend : `maxFee = baseFee * 2`.
 */
const MAX_FEE_MULTIPLIER = 2n;

/**
 * Construction d'une tx native SANGO.
 *
 * **D-SESS-10** — `SendParams` est une union discriminée. Ce builder
 * dispatche sur `params.kind` et produit le `txKind` SANGO + payload
 * correspondant. La source (sender) est fournie par la session, déjà
 * résolue depuis l'`AccountRef`.
 *
 * V0.2 : seul `"transfer"` est supporté. Ajouter un variant à
 * `SendParams` **exige** d'ajouter le `case` correspondant ici — le
 * `default:` contient un check `never` qui provoque une erreur TS
 * sinon.
 */
export class SangoTransactionBuilder implements TransactionBuilder {
  readonly #rpc: SangoRpc;
  readonly #networkId: string;
  readonly #chainId: Uint8Array;
  readonly #bech32Network: "mainnet" | "testnet";

  constructor(
    rpc: SangoRpc,
    networkId: string,
    chainIdHex: string,
    bech32Network: "mainnet" | "testnet",
  ) {
    this.#rpc = rpc;
    this.#networkId = networkId;
    this.#chainId = hexToBytes(chainIdHex);
    this.#bech32Network = bech32Network;
  }

  async build(params: SendParams, sender: Address): Promise<ChainsUnsignedTx> {
    assertNativeSango(params, this.#networkId);

    switch (params.kind) {
      case "transfer":
        return this.#buildTransfer(params, sender);
      default: {
        // Exhaustive check : `params.kind` est narrow à `never` ici
        // (tous les variants de SendParams ont été épuisés par les
        // cases ci-dessus). Ajouter un variant sans case → erreur TS
        // sur l'assignation ci-dessous.
        //
        // Note : `params` (objet) n'est pas narrow à `never` par TS
        // car SendParams n'est pas une vraie union en V0.2 (un seul
        // variant). C'est `params.kind` qui porte le narrowing.
        const _kind: never = params.kind;
        throw new Error(
          `SangoTransactionBuilder: unsupported send kind "${String(_kind)}"`,
        );
      }
    }
  }

  async #buildTransfer(
    params: Extract<SendParams, { kind: "transfer" }>,
    sender: Address,
  ): Promise<ChainsUnsignedTx> {
    const fromHex = normalizeToHex(sender, this.#bech32Network);
    const toBytes = toAddressBytes(params.to, this.#bech32Network);
    const fromBytes = hexToBytes(fromHex);

    const account = await this.#rpc.getAccount(fromHex);
    const nonce = BigInt(account?.nonce ?? 0);
    const publicKey = account?.publicKey ? hexToBytes(account.publicKey) : null;

    const baseFee = BigInt(await this.#rpc.getBaseFee());
    const maxFee = baseFee * MAX_FEE_MULTIPLIER;

    const concrete: WalletCoreUnsignedTx = {
      version: SANGO_TX_VERSION,
      chainId: this.#chainId,
      nonce,
      sender: fromBytes,
      publicKey,
      gasLimit: DEFAULT_GAS_LIMIT,
      maxFee,
      priorityFee: DEFAULT_PRIORITY_FEE,
      value: params.amount,
      txKind: TX_KIND.Transfer,
      recipient: toBytes,
      data: params.memo ?? new Uint8Array(0),
    };

    const meta: TxMeta = {
      from: sender,
      to: params.to,
      assetRef: params.assetRef,
      amount: params.amount,
    };

    return {
      family: "sango",
      networkId: this.#networkId,
      payload: concrete,
      meta,
    };
  }
}

function toAddressBytes(
  input: string,
  bech32Network: "mainnet" | "testnet",
): Uint8Array {
  if (/^0x[0-9a-fA-F]{40}$/.test(input)) {
    return hexToBytes(input);
  }
  return decodeNativeAddress(input, bech32Network);
}

function normalizeToHex(
  input: string,
  bech32Network: "mainnet" | "testnet",
): string {
  return bytesToHex(toAddressBytes(input, bech32Network));
}

function assertNativeSango(params: SendParams, networkId: string): void {
  if (
    params.assetRef.kind !== "native" ||
    params.assetRef.assetId !== SANGO_NATIVE_ASSET_ID
  ) {
    throw new Error(
      "SangoTransactionBuilder: only native SANGO supported in V0",
    );
  }
  if (params.assetRef.networkId !== networkId) {
    throw new Error(
      `SangoTransactionBuilder: network mismatch (expected "${networkId}")`,
    );
  }
}
