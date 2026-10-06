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
const DEFAULT_PRIORITY_FEE = 0n;
const MAX_FEE_MULTIPLIER = 2n;

/**
 * Gas par `kind` — miroir exact de `@sango/sdk` `DEFAULT_GAS_BY_TX_KIND`.
 *
 * ⚠️ Ces valeurs sont la **source de vérité**. `apps/wallet/src/lib/config.ts`
 *    contient une ancienne table (`GAS_BY_TX_KIND`) avec des valeurs
 *    divergentes (ex. Delegate 80 000 vs 300 000). Elle sera nettoyée
 *    au patch 6 de V0.2 — d'ici là elle n'est plus utilisée pour le
 *    calcul réel.
 */
/**
 * Gas par `kind` pour les opérations SANGO-supportées.
 *
 * `transferErc20` est exclu (EVM-only) — voir le `case` correspondant
 * dans `#encodeParams`.
 */
type SangoSendKind = Exclude<
  SendParams["kind"],
  "transferErc20" | "approveErc20" | "transferBitcoin"
>;

const GAS_BY_KIND: Readonly<Record<SangoSendKind, bigint>> = {
  transfer: 21_000n,
  bond: 50_000n,
  unbond: 50_000n,
  delegate: 300_000n,
  undelegate: 300_000n,
  claimRewards: 40_000n,
  registerValidator: 200_000n,
  updateCommission: 30_000n,
  unjail: 30_000n,
};

/**
 * Construction d'une tx native SANGO.
 *
 * **D-SESS-10** — `SendParams` est une union discriminée. Ce builder
 * dispatche sur `params.kind` et produit le `txKind` SANGO + payload
 * correspondant.
 *
 * Toutes les opérations ont le même pipeline :
 *   1. résoudre sender → hex, lire nonce + publicKey (bootstrap) ;
 *   2. lire `baseFee` → calculer `maxFee` ;
 *   3. encoder le payload selon `kind` ;
 *   4. assembler la `WalletCoreUnsignedTx`.
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

    const fromHex = normalizeToHex(sender, this.#bech32Network);
    const fromBytes = hexToBytes(fromHex);
    const account = await this.#rpc.getAccount(fromHex);
    const nonce = BigInt(account?.nonce ?? 0);
    const publicKey = account?.publicKey ? hexToBytes(account.publicKey) : null;

    const baseFee = BigInt(await this.#rpc.getBaseFee());
    const maxFee = baseFee * MAX_FEE_MULTIPLIER;

    const encoded = this.#encodeParams(params);

    const concrete: WalletCoreUnsignedTx = {
      version: SANGO_TX_VERSION,
      chainId: this.#chainId,
      nonce,
      sender: fromBytes,
      publicKey,
      gasLimit: encoded.gasLimit,
      maxFee,
      priorityFee: DEFAULT_PRIORITY_FEE,
      value: encoded.value,
      txKind: encoded.txKind,
      recipient: encoded.recipient,
      data: encoded.data,
    };

    return {
      family: "sango",
      networkId: this.#networkId,
      payload: concrete,
      meta: buildMeta(params, sender),
    };
  }

  #encodeParams(params: SendParams): EncodedParams {
    switch (params.kind) {
      case "transfer":
        return {
          txKind: TX_KIND.Transfer,
          value: params.amount,
          recipient: toAddressBytes(params.to, this.#bech32Network),
          data: params.memo ?? new Uint8Array(0),
          gasLimit: GAS_BY_KIND.transfer,
        };
      case "bond":
        return {
          txKind: TX_KIND.Bond,
          value: params.amount,
          recipient: null,
          data: new Uint8Array(0),
          gasLimit: GAS_BY_KIND.bond,
        };
      case "unbond":
        return {
          txKind: TX_KIND.Unbond,
          value: params.amount,
          recipient: null,
          data: new Uint8Array(0),
          gasLimit: GAS_BY_KIND.unbond,
        };
      case "delegate":
        return {
          txKind: TX_KIND.Delegate,
          value: params.amount,
          recipient: toAddressBytes(params.validator, this.#bech32Network),
          data: new Uint8Array(0),
          gasLimit: GAS_BY_KIND.delegate,
        };
      case "undelegate":
        return {
          txKind: TX_KIND.Undelegate,
          value: params.amount,
          recipient: toAddressBytes(params.validator, this.#bech32Network),
          data: new Uint8Array(0),
          gasLimit: GAS_BY_KIND.undelegate,
        };
      case "claimRewards":
        return {
          txKind: TX_KIND.ClaimRewards,
          value: 0n,
          recipient: toAddressBytes(params.validator, this.#bech32Network),
          data: new Uint8Array(0),
          gasLimit: GAS_BY_KIND.claimRewards,
        };
      case "registerValidator":
        assertCommissionBps(params.commissionBps, "commissionBps");
        return {
          txKind: TX_KIND.RegisterValidator,
          value: params.selfStake,
          recipient: null,
          data: u32BE(params.commissionBps),
          gasLimit: GAS_BY_KIND.registerValidator,
        };
      case "updateCommission":
        assertCommissionBps(params.newCommissionBps, "newCommissionBps");
        return {
          txKind: TX_KIND.UpdateCommission,
          value: 0n,
          recipient: null,
          data: u32BE(params.newCommissionBps),
          gasLimit: GAS_BY_KIND.updateCommission,
        };
      case "unjail":
        return {
          txKind: TX_KIND.Unjail,
          value: 0n,
          recipient: null,
          data: new Uint8Array(0),
          gasLimit: GAS_BY_KIND.unjail,
        };
      case "transferErc20":
        // E1.6 — EVM-only. SANGO n'a pas d'ERC-20.
        throw new Error(
          "SangoTransactionBuilder: transferErc20 is EVM-only and not supported on SANGO",
        );
      case "approveErc20":
        // E2.2.a.2 — EVM-only. SANGO n'a pas d'ERC-20.
        throw new Error(
          "SangoTransactionBuilder: approveErc20 is EVM-only and not supported on SANGO",
        );
      case "transferBitcoin":
        // E2.1.b.3 — Bitcoin-only. SANGO n'a pas d'UTXOs.
        throw new Error(
          "SangoTransactionBuilder: transferBitcoin is Bitcoin-only and not supported on SANGO",
        );
      default: {
        // Exhaustive check : `params` est narrow à `never` ici (tous
        // les variants de SendParams ont été épuisés par les cases
        // ci-dessus). Ajouter un variant sans case → erreur TS sur
        // l'assignation ci-dessous.
        const _exhaustive: never = params;
        throw new Error(
          `SangoTransactionBuilder: unsupported send params ${JSON.stringify(_exhaustive)}`,
        );
      }
    }
  }
}

// --- Types internes -------------------------------------------------------

interface EncodedParams {
  readonly txKind: number;
  readonly value: bigint;
  readonly recipient: Uint8Array | null;
  readonly data: Uint8Array;
  readonly gasLimit: bigint;
}

// --- Helpers --------------------------------------------------------------

/**
 * Construit la `TxMeta` lisible à partir des `SendParams`.
 *
 * `to` et `amount` sont optionnels selon le variant (voir types/tx.ts).
 */
function buildMeta(params: SendParams, sender: Address): TxMeta {
  switch (params.kind) {
    case "transfer":
      return {
        from: sender,
        to: params.to,
        assetRef: params.assetRef,
        amount: params.amount,
      };
    case "bond":
    case "unbond":
      return {
        from: sender,
        assetRef: params.assetRef,
        amount: params.amount,
      };
    case "delegate":
    case "undelegate":
      return {
        from: sender,
        to: params.validator,
        assetRef: params.assetRef,
        amount: params.amount,
      };
    case "claimRewards":
      return {
        from: sender,
        to: params.validator,
        assetRef: params.assetRef,
        amount: 0n,
      };
    case "registerValidator":
      return {
        from: sender,
        assetRef: params.assetRef,
        amount: params.selfStake,
      };
    case "updateCommission":
    case "unjail":
      return {
        from: sender,
        assetRef: params.assetRef,
        amount: 0n,
      };
    case "approveErc20":
      // E2.2.a.2 — EVM-only.
      throw new Error(
        "SangoTransactionBuilder.buildMeta: approveErc20 is EVM-only",
      );
    case "transferBitcoin":
      // E2.1.b.3 — Bitcoin-only.
      throw new Error(
        "SangoTransactionBuilder.buildMeta: transferBitcoin is Bitcoin-only",
      );
    default:
      // transferErc20 est EVM-only. Throw explicite pour couvrir
      // l'exhaustivité côté TS et future-proof les variants.
      throw new Error(
        `SangoTransactionBuilder.buildMeta: unsupported kind "${(params as { kind: string }).kind}"`,
      );
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

/** u32 big-endian (aligné sur `@sango/sdk` helper `u32BE`). */
function u32BE(n: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (n >>> 24) & 0xff;
  out[1] = (n >>> 16) & 0xff;
  out[2] = (n >>> 8) & 0xff;
  out[3] = n & 0xff;
  return out;
}

function assertCommissionBps(bps: number, name: string): void {
  if (!Number.isInteger(bps) || bps < 0 || bps > 1_000) {
    throw new Error(`${name} must be an integer in [0, 1000]`);
  }
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
