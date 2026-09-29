import {
  TX_KIND,
  decodeNativeAddress,
  type UnsignedTransaction as WalletCoreUnsignedTx,
} from "@sango/wallet-core";

import type {
  SendParams,
  TransactionBuilder,
} from "../capabilities/transaction-builder";
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
 * Construction d'une tx native SANGO (V0 : Transfer uniquement).
 *
 * Le builder interroge le RPC pour récupérer `nonce`, `publicKey`
 * (bootstrap si null) et `baseFee`, puis assemble une
 * `UnsignedTransaction` de wallet-core enveloppée dans le type
 * opaque de `wallet-chains`.
 *
 * Conventions d'adresse :
 *  - `from` : hex `0x…` (issu de `AddressProvider.deriveAddress`).
 *  - `to`   : hex **ou** Bech32m — normalisé en interne.
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

  async build(params: SendParams): Promise<ChainsUnsignedTx> {
    assertNativeSango(params, this.#networkId);

    // D-SESS-8 : `from` est optionnel côté type (WalletSession l'injecte),
    // mais requis ici. Erreur explicite pour guider le caller.
    if (!params.from) {
      throw new Error(
        "SangoTransactionBuilder.build: 'from' is required when calling " +
          "build() directly. Use WalletSession.send(params, account) to " +
          "have the source derived from the account.",
      );
    }

    const fromHex = normalizeToHex(params.from, this.#bech32Network);
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
      from: params.from,
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
      "SangoTransactionBuilder: only native SANGO transfers supported in V0",
    );
  }
  if (params.assetRef.networkId !== networkId) {
    throw new Error(
      `SangoTransactionBuilder: network mismatch (expected "${networkId}")`,
    );
  }
}
