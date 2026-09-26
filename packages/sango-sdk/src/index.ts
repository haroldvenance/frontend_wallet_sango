import type { AddressHex, Hex, Network, TxHashHex } from "@sango/types";
import { SangoRpcClient } from "@sango/rpc";
import type { Account, ChainInfo } from "@sango/rpc";
import {
  encodeTransaction,
  TX_KIND,
  Wallet,
  type Transaction,
  type UnsignedTransaction,
} from "@sango/wallet-core";

export interface SangoClientOptions {
  readonly endpoint: string;
  readonly network?: Network;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}

export interface SendOptions {
  readonly to: AddressHex;
  readonly amountBaseUnits: bigint;
  readonly gasLimit?: bigint;
  readonly maxFee?: bigint;
  readonly priorityFee?: bigint;
}

export interface InclusionResult {
  readonly txHash: TxHashHex;
  readonly included: boolean;
  readonly nonce: number;
}

/**
 * Client haut niveau qui combine `Wallet` + `SangoRpcClient`.
 *
 * Utilisation type :
 *
 *   const sdk = new SangoClient({ endpoint, network: "testnet" });
 *   sdk.attachWallet(wallet);
 *   const acc = await sdk.getAccount();
 *   const { txHash } = await sdk.send({ to, amountBaseUnits: 1000n });
 *   await sdk.waitForInclusion(txHash);
 */
export class SangoClient {
  readonly rpc: SangoRpcClient;
  readonly network: Network;
  #wallet: Wallet | null = null;

  constructor(options: SangoClientOptions) {
    this.rpc = new SangoRpcClient(options.endpoint, {
      timeoutMs: options.timeoutMs,
      fetch: options.fetch,
    });
    this.network = options.network ?? "mainnet";
  }

  attachWallet(wallet: Wallet): void {
    this.#wallet = wallet;
  }

  detachWallet(): void {
    this.#wallet = null;
  }

  get wallet(): Wallet {
    if (!this.#wallet) throw new Error("No wallet attached");
    return this.#wallet;
  }

  get isAttached(): boolean {
    return this.#wallet !== null;
  }

  getChainId(): Promise<Hex> {
    return this.rpc.getChainId();
  }

  getChainInfo(): Promise<ChainInfo> {
    return this.rpc.getChainInfo();
  }

  /**
   * Base fee courante (base units par gas), string décimale.
   */
  getBaseFee(): Promise<string> {
    return this.rpc.getBaseFee();
  }

  async getAccount(): Promise<Account | null> {
    if (!this.#wallet) return null;
    return this.rpc.getAccount(this.#wallet.identity.addressHex as Hex);
  }

  /**
   * Signe + broadcast une transaction Transfer.
   *
   * Retourne le tx_hash calculé localement (== celui renvoyé par le RPC).
   */
  async send(options: SendOptions): Promise<{ txHash: TxHashHex; signed: Transaction }> {
    const wallet = this.wallet;

    const chainIdHex = await this.rpc.getChainId();
    const chainIdBytes = new Uint8Array(
      chainIdHex.slice(2).match(/.{2}/g)!.map((h) => Number.parseInt(h, 16)),
    );

    const acc = await this.rpc.getAccount(wallet.identity.addressHex as Hex);
    if (!acc) throw new Error("Account not found on chain");

    const recipient = new Uint8Array(
      options.to.slice(2).match(/.{2}/g)!.map((h) => Number.parseInt(h, 16)),
    );
    if (recipient.length !== 20) throw new Error("recipient must be 20 bytes");

    // Bootstrap : la première tx doit déclarer la publicKey si elle n'est pas enregistrée.
    const publicKey = acc.publicKey === null ? wallet.identity.publicKey : null;

    const unsigned: UnsignedTransaction = {
      version: 1,
      chainId: chainIdBytes,
      nonce: BigInt(acc.nonce),
      sender: wallet.identity.address,
      publicKey,
      gasLimit: options.gasLimit ?? 21_000n,
      maxFee: options.maxFee ?? 1_000n,
      priorityFee: options.priorityFee ?? 0n,
      value: options.amountBaseUnits,
      txKind: TX_KIND.Transfer,
      recipient,
      data: new Uint8Array(0),
    };

    const signed = await wallet.signTransaction(unsigned);
    const fullHex = ("0x" +
      Array.from(encodeTransaction(signed), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("")) as Hex;

    const txHash = await this.rpc.sendTransaction(fullHex);
    return { txHash, signed };
  }

  /**
   * Poll le nonce jusqu'à ce qu'il avance, ou timeout.
   */
  async waitForInclusion(
    txHash: TxHashHex,
    opts: { timeoutMs?: number; pollMs?: number } = {},
  ): Promise<InclusionResult> {
    const wallet = this.wallet;
    const timeoutMs = opts.timeoutMs ?? 15_000;
    const pollMs = opts.pollMs ?? 500;
    const start = Date.now();
    const initial = await this.rpc.getAccount(wallet.identity.addressHex as Hex);
    if (!initial) throw new Error("Account not found");
    const initialNonce = initial.nonce;

    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollMs));
      const acc = await this.rpc.getAccount(wallet.identity.addressHex as Hex);
      if (acc && acc.nonce > initialNonce) {
        return { txHash, included: true, nonce: acc.nonce };
      }
    }
    return { txHash, included: false, nonce: initialNonce };
  }
}
