import type { AddressHex, Hex, Network, TxHashHex } from "@sango/types";
import { SangoRpcClient } from "@sango/rpc";
import type {
  Account,
  ChainInfo,
  EvmBlock,
  Delegation,
  PendingUnbonding,
  ValidatorInfo,
} from "@sango/rpc";
import {
  encodeTransaction,
  TX_KIND,
  Wallet,
  type Transaction,
  type UnsignedTransaction,
} from "@sango/wallet-core";

// --- Helpers staking ------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("hex must have even length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function u32BE(n: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (n >>> 24) & 0xff;
  out[1] = (n >>> 16) & 0xff;
  out[2] = (n >>> 8) & 0xff;
  out[3] = n & 0xff;
  return out;
}

/** Gas par défaut par TxKind (miroir de `apps/wallet/src/lib/config.ts`). */
const DEFAULT_GAS_BY_TX_KIND: Record<number, bigint> = {
  [TX_KIND.Bond]: 50_000n,
  [TX_KIND.Unbond]: 50_000n,
  [TX_KIND.Delegate]: 300_000n,
  [TX_KIND.Undelegate]: 300_000n,
  [TX_KIND.ClaimRewards]: 40_000n,
  [TX_KIND.RegisterValidator]: 200_000n,
  [TX_KIND.UpdateCommission]: 30_000n,
  [TX_KIND.Unjail]: 30_000n,
};

/** Options communes aux transactions de staking. */
export interface StakingOptions {
  readonly gasLimit?: bigint;
  readonly maxFee?: bigint;
  readonly priorityFee?: bigint;
}

/** Résultat d'une transaction de staking. */
export interface StakingResult {
  readonly txHash: TxHashHex;
  readonly signed: Transaction;
}

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

export type InclusionStatus = "included" | "pending" | "rejected" | "dropped";

export interface InclusionResult {
  readonly txHash: TxHashHex;
  readonly status: InclusionStatus;
  readonly nonce: number;
  readonly blockHeight?: number;
  readonly error?: string;
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

  // --- Réseau (blocs) -----------------------------------------------------

  /**
   * Renvoie les `count` derniers blocs (du plus récent au plus ancien).
   *
   * Utilise `eth_getBlockByNumber` (namespace EVM). Chaque appel est
   * indépendant — on fetch en parallèle.
   */
  async getRecentBlocks(count = 5): Promise<EvmBlock[]> {
    const latest = await this.rpc.ethBlockNumber();
    const heights: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const h = latest - i;
      if (h < 0) break;
      heights.push(h);
    }

    const blocks = await Promise.all(
      heights.map((h) => this.rpc.ethGetBlockByNumber(h, false)),
    );

    return blocks.filter((b): b is EvmBlock => b !== null);
  }

  // --- Validators (lecture) -----------------------------------------------

  /** Liste complète des validateurs. */
  getValidators(): Promise<ValidatorInfo[]> {
    return this.rpc.getValidators();
  }

  /** Infos d'un validateur précis, ou null. */
  getValidatorInfo(address: AddressHex): Promise<ValidatorInfo | null> {
    return this.rpc.getValidatorInfo(address);
  }

  /** Délégations d'une adresse quelconque (délégateur). */
  getDelegations(address: AddressHex): Promise<Delegation[]> {
    return this.rpc.getDelegations(address);
  }

  /** Événements d'unbonding en attente pour une adresse quelconque. */
  getPendingUnbondings(address: AddressHex): Promise<PendingUnbonding[]> {
    return this.rpc.getPendingUnbondings(address);
  }

  /** Délégations du wallet courant. */
  getMyDelegations(): Promise<Delegation[]> {
    return this.rpc.getDelegations(this.wallet.identity.addressHex as Hex);
  }

  /** Unbondings en attente du wallet courant. */
  getMyPendingUnbondings(): Promise<PendingUnbonding[]> {
    return this.rpc.getPendingUnbondings(this.wallet.identity.addressHex as Hex);
  }

  // --- Staking (écriture) --------------------------------------------------

  /** Self-stake de `amountBaseUnits` (min 100 000 SANGO = 10¹² base units). */
  bond(amountBaseUnits: bigint, opts?: StakingOptions): Promise<StakingResult> {
    return this.#sendStakingTx({
      txKind: TX_KIND.Bond,
      value: amountBaseUnits,
      recipient: null,
      data: new Uint8Array(0),
      opts,
    });
  }

  /** Retrait du self-stake (déclenche unbonding 14 jours). */
  unbond(amountBaseUnits: bigint, opts?: StakingOptions): Promise<StakingResult> {
    return this.#sendStakingTx({
      txKind: TX_KIND.Unbond,
      value: amountBaseUnits,
      recipient: null,
      data: new Uint8Array(0),
      opts,
    });
  }

  /** Délègue `amountBaseUnits` à un validateur. */
  delegate(
    validator: AddressHex,
    amountBaseUnits: bigint,
    opts?: StakingOptions,
  ): Promise<StakingResult> {
    return this.#sendStakingTx({
      txKind: TX_KIND.Delegate,
      value: amountBaseUnits,
      recipient: hexToBytes(validator),
      data: new Uint8Array(0),
      opts,
    });
  }

  /** Retire une délégation (déclenche unbonding 14 jours). */
  undelegate(
    validator: AddressHex,
    amountBaseUnits: bigint,
    opts?: StakingOptions,
  ): Promise<StakingResult> {
    return this.#sendStakingTx({
      txKind: TX_KIND.Undelegate,
      value: amountBaseUnits,
      recipient: hexToBytes(validator),
      data: new Uint8Array(0),
      opts,
    });
  }

  /** Réclame les récompenses accumulées auprès d'un validateur. */
  claimRewards(validator: AddressHex, opts?: StakingOptions): Promise<StakingResult> {
    return this.#sendStakingTx({
      txKind: TX_KIND.ClaimRewards,
      value: 0n,
      recipient: hexToBytes(validator),
      data: new Uint8Array(0),
      opts,
    });
  }

  /**
   * Enregistre le wallet courant comme validateur.
   *
   * `data = commission_bps(4 BE) || public_key(32)`.
   * Le `public_key` utilisé est celui du wallet.
   *
   * @param commissionBps 0..1000 (0 % à 10 %)
   * @param selfStakeBaseUnits doit être ≥ 100 000 SANGO
   */
  registerValidator(
    commissionBps: number,
    selfStakeBaseUnits: bigint,
    opts?: StakingOptions,
  ): Promise<StakingResult> {
    if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 1_000) {
      throw new Error("commissionBps must be an integer in [0, 1000]");
    }
    // Backend confirmé (sango-exec/src/staking.rs) :
    //   data = commission_bps(4 BE) UNIQUEMENT — pas de pubkey dedans.
    //   La pubkey va dans Transaction.public_key (géré par #sendStakingTx
    //   via le mécanisme de bootstrap : Some(pk) ssi le compte n'a pas
    //   encore de clé enregistrée).
    const data = u32BE(commissionBps);
    return this.#sendStakingTx({
      txKind: TX_KIND.RegisterValidator,
      value: selfStakeBaseUnits,
      recipient: null,
      data,
      opts,
    });
  }

  /**
   * Modifie la commission. `data = new_commission_bps(4 BE)`.
   * Prend effet après 7 jours.
   *
   * @param newCommissionBps 0..1000
   */
  updateCommission(
    newCommissionBps: number,
    opts?: StakingOptions,
  ): Promise<StakingResult> {
    if (!Number.isInteger(newCommissionBps) || newCommissionBps < 0 || newCommissionBps > 1_000) {
      throw new Error("newCommissionBps must be an integer in [0, 1000]");
    }
    return this.#sendStakingTx({
      txKind: TX_KIND.UpdateCommission,
      value: 0n,
      recipient: null,
      data: u32BE(newCommissionBps),
      opts,
    });
  }

  /** Sort de jail (après expiration de la période de downtime). */
  unjail(opts?: StakingOptions): Promise<StakingResult> {
    return this.#sendStakingTx({
      txKind: TX_KIND.Unjail,
      value: 0n,
      recipient: null,
      data: new Uint8Array(0),
      opts,
    });
  }

  // --- Helper interne staking ----------------------------------------------

  async #sendStakingTx(args: {
    txKind: number;
    value: bigint;
    recipient: Uint8Array | null;
    data: Uint8Array;
    opts?: StakingOptions;
  }): Promise<StakingResult> {
    const wallet = this.wallet;

    const chainIdHex = await this.rpc.getChainId();
    const chainIdBytes = hexToBytes(chainIdHex);

    const acc = await this.rpc.getAccount(wallet.identity.addressHex as Hex);
    if (!acc) throw new Error("Account not found on chain");

    const gasLimit = args.opts?.gasLimit ?? DEFAULT_GAS_BY_TX_KIND[args.txKind] ?? 100_000n;

    let maxFee = args.opts?.maxFee;
    if (maxFee === undefined) {
      try {
        maxFee = BigInt(await this.rpc.getBaseFee()) * 2n;
      } catch {
        maxFee = 1_000n;
      }
    }

    // Bootstrap : déclare la clé publique si le compte n'en a pas encore.
    const publicKey = acc.publicKey === null ? wallet.identity.publicKey : null;

    const unsigned: UnsignedTransaction = {
      version: 1,
      chainId: chainIdBytes,
      nonce: BigInt(acc.nonce),
      sender: wallet.identity.address,
      publicKey,
      gasLimit,
      maxFee,
      priorityFee: args.opts?.priorityFee ?? 0n,
      value: args.value,
      txKind: args.txKind,
      recipient: args.recipient,
      data: args.data,
    };

    const signed = await wallet.signTransaction(unsigned);
    const fullHex = ("0x" +
      Array.from(encodeTransaction(signed), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("")) as Hex;

    const txHash = await this.rpc.sendTransaction(fullHex);
    return { txHash: txHash as TxHashHex, signed };
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

    // Snapshot nonce initial.
    const initial = await this.rpc.getAccount(wallet.identity.addressHex as Hex);
    if (!initial) throw new Error("Account not found");
    const initialNonce = initial.nonce;

    let notFoundStreak = 0;
    const NOT_FOUND_THRESHOLD = 3;

    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollMs));

      // 1. Tentative getTransactionByHash.
      try {
        const tx = await this.rpc.getTransactionByHash(txHash);
        notFoundStreak = 0;

        if (tx && tx.blockHeight !== null) {
          return {
            txHash,
            status: "included",
            nonce: tx.nonce,
            blockHeight: tx.blockHeight,
          };
        }
        // tx existe mais en mempool — on continue.
      } catch {
        // Erreur réseau ponctuelle → on continue.
      }

      // 2. Vérifie le nonce.
      const acc = await this.rpc.getAccount(wallet.identity.addressHex as Hex);
      if (acc && acc.nonce > initialNonce) {
        // Le nonce a avancé mais la tx reste introuvable → rejet probable.
        if (notFoundStreak >= NOT_FOUND_THRESHOLD) {
          return {
            txHash,
            status: "rejected",
            nonce: acc.nonce,
            error:
              "Transaction rejetée ou remplacée (nonce avancé, tx absente de la chaîne). " +
              "Consulte les logs du node (RUST_LOG=debug).",
          };
        }
        // Sinon, on considère que c'est la bonne tx.
        return {
          txHash,
          status: "included",
          nonce: acc.nonce,
        };
      }

      // 3. Incrémente le streak "non trouvée".
      const txStillMissing = await this.rpc
        .getTransactionByHash(txHash)
        .then((t) => t === null)
        .catch(() => false);
      if (txStillMissing) notFoundStreak += 1;
    }

    // Timeout. Distingue pending (connue du RPC) vs dropped (inconnue).
    try {
      const tx = await this.rpc.getTransactionByHash(txHash);
      if (!tx) {
        return {
          txHash,
          status: "dropped",
          nonce: initialNonce,
          error:
            "Transaction inconnue du RPC après timeout. " +
            "Probablement évincée du mempool ou rejetée silencieusement.",
        };
      }
      return {
        txHash,
        status: "pending",
        nonce: initialNonce,
      };
    } catch {
      return {
        txHash,
        status: "pending",
        nonce: initialNonce,
      };
    }
  }
}
