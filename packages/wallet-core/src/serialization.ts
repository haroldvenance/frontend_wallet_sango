import { keccak_256 } from "@noble/hashes/sha3.js";

import { DOMAINS } from "./signing";

// --- Writer / Reader -------------------------------------------------------

/**
 * Writer little-endian, aligné sur `sango-codec` côté Rust.
 *
 * Règles :
 *  - u8   : 1 byte
 *  - u32  : 4 bytes LE
 *  - u64  : 8 bytes LE
 *  - u128 : 16 bytes LE
 *  - bool : 1 byte (0|1)
 *  - Option<T> : u8 tag (0=None, 1=Some) + T si Some
 *  - Vec<u8> : u32 LE len + bytes
 *  - Vec<T>  : u32 LE count + éléments
 */
export class Writer {
  #buf: number[] = [];

  u8(v: number): this {
    if (!Number.isInteger(v) || v < 0 || v > 0xff) {
      throw new Error(`u8 out of range: ${v}`);
    }
    this.#buf.push(v);
    return this;
  }

  u32(v: number): this {
    if (!Number.isInteger(v) || v < 0 || v > 0xffff_ffff) {
      throw new Error(`u32 out of range: ${v}`);
    }
    this.#buf.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
    return this;
  }

  u64(v: bigint): this {
    if (v < 0n || v > 0xffff_ffff_ffff_ffffn) {
      throw new Error(`u64 out of range: ${v}`);
    }
    for (let i = 0n; i < 8n; i += 1n) {
      this.#buf.push(Number((v >> (8n * i)) & 0xffn));
    }
    return this;
  }

  u128(v: bigint): this {
    if (v < 0n || v > (1n << 128n) - 1n) {
      throw new Error(`u128 out of range: ${v}`);
    }
    for (let i = 0n; i < 16n; i += 1n) {
      this.#buf.push(Number((v >> (8n * i)) & 0xffn));
    }
    return this;
  }

  bool(b: boolean): this {
    return this.u8(b ? 1 : 0);
  }

  raw(b: Uint8Array): this {
    for (const x of b) this.#buf.push(x);
    return this;
  }

  vecBytes(b: Uint8Array): this {
    this.u32(b.length);
    return this.raw(b);
  }

  option<T>(v: T | null | undefined, encode: (v: T) => void): this {
    if (v == null) return this.u8(0);
    this.u8(1);
    encode(v);
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.#buf);
  }
}

export class Reader {
  #offset = 0;
  readonly #bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
  }

  get remaining(): number {
    return this.#bytes.length - this.#offset;
  }

  u8(): number {
    this.#ensure(1);
    return this.#bytes[this.#offset++];
  }

  u32(): number {
    this.#ensure(4);
    const o = this.#offset;
    const v =
      this.#bytes[o] |
      (this.#bytes[o + 1] << 8) |
      (this.#bytes[o + 2] << 16) |
      (this.#bytes[o + 3] << 24);
    this.#offset += 4;
    return v >>> 0;
  }

  u64(): bigint {
    this.#ensure(8);
    let v = 0n;
    for (let i = 0; i < 8; i += 1) {
      v |= BigInt(this.#bytes[this.#offset + i]) << BigInt(8 * i);
    }
    this.#offset += 8;
    return v;
  }

  u128(): bigint {
    this.#ensure(16);
    let v = 0n;
    for (let i = 0; i < 16; i += 1) {
      v |= BigInt(this.#bytes[this.#offset + i]) << BigInt(8 * i);
    }
    this.#offset += 16;
    return v;
  }

  bool(): boolean {
    const b = this.u8();
    if (b > 1) throw new Error(`invalid bool: ${b}`);
    return b === 1;
  }

  raw(n: number): Uint8Array {
    this.#ensure(n);
    const out = this.#bytes.slice(this.#offset, this.#offset + n);
    this.#offset += n;
    return out;
  }

  vecBytes(): Uint8Array {
    const len = this.u32();
    return this.raw(len);
  }

  option<T>(decode: () => T): T | null {
    const tag = this.u8();
    if (tag === 0) return null;
    if (tag === 1) return decode();
    throw new Error(`invalid option tag: ${tag}`);
  }

  expectEnd(): void {
    if (this.#offset !== this.#bytes.length) {
      throw new Error(`trailing bytes: ${this.#bytes.length - this.#offset}`);
    }
  }

  #ensure(n: number): void {
    if (this.#offset + n > this.#bytes.length) {
      throw new Error(`unexpected end of buffer: need ${n}, have ${this.remaining}`);
    }
  }
}

// --- Transaction native Sango ----------------------------------------------

export const TX_KIND = Object.freeze({
  Transfer: 0x01,
  ContractCall: 0x02,
  ContractCreate: 0x03,
  Bond: 0x04,
  Unbond: 0x05,
  Delegate: 0x06,
  Undelegate: 0x07,
  ClaimRewards: 0x08,
  RegisterValidator: 0x09,
  UpdateCommission: 0x0a,
  Unjail: 0x0b,
});

export type TxKind = (typeof TX_KIND)[keyof typeof TX_KIND];

const PUBLIC_KEY_LENGTH = 32;
const ADDRESS_LENGTH = 20;
const SIGNATURE_LENGTH = 64;

/**
 * Transaction native Sango, miroir de `sango_types::Transaction`.
 *
 * ⚠️ `value` est en **base units** (1 SANGO = 10 000 000 base units).
 *    Aucun float n'est autorisé, tout est en `bigint`.
 */
export interface Transaction {
  version: number;
  chainId: Uint8Array;
  nonce: bigint;
  sender: Uint8Array;
  publicKey: Uint8Array | null;
  gasLimit: bigint;
  maxFee: bigint;
  priorityFee: bigint;
  value: bigint;
  txKind: number;
  recipient: Uint8Array | null;
  data: Uint8Array;
  signature: Uint8Array;
}

export type UnsignedTransaction = Omit<Transaction, "signature">;

function assertLength(v: Uint8Array, expected: number, name: string): void {
  if (v.length !== expected) {
    throw new Error(`${name} must be exactly ${expected} bytes, got ${v.length}`);
  }
}

/**
 * Encode les champs **sans** la signature.
 *
 * Ordre canonique (miroir de `Transaction::encode_unsigned`) :
 *
 *   version || chain_id || nonce || sender || public_key
 *   || gas_limit || max_fee || priority_fee || value
 *   || tx_kind || recipient || data
 */
export function encodeUnsignedTransaction(tx: UnsignedTransaction): Uint8Array {
  assertLength(tx.chainId, 32, "chainId");
  assertLength(tx.sender, ADDRESS_LENGTH, "sender");
  if (tx.publicKey) assertLength(tx.publicKey, PUBLIC_KEY_LENGTH, "publicKey");
  if (tx.recipient) assertLength(tx.recipient, ADDRESS_LENGTH, "recipient");

  const w = new Writer();
  w.u32(tx.version);
  w.raw(tx.chainId);
  w.u64(tx.nonce);
  w.raw(tx.sender);
  w.option(tx.publicKey, (pk) => w.raw(pk));
  w.u64(tx.gasLimit);
  w.u128(tx.maxFee);
  w.u128(tx.priorityFee);
  w.u128(tx.value);
  w.u8(tx.txKind);
  w.option(tx.recipient, (r) => w.raw(r));
  w.vecBytes(tx.data);
  return w.toBytes();
}

export function encodeTransaction(tx: Transaction): Uint8Array {
  assertLength(tx.signature, SIGNATURE_LENGTH, "signature");
  const w = new Writer();
  w.raw(encodeUnsignedTransaction(tx));
  w.raw(tx.signature);
  return w.toBytes();
}

export function decodeTransaction(bytes: Uint8Array): Transaction {
  const r = new Reader(bytes);
  const version = r.u32();
  const chainId = r.raw(32);
  const nonce = r.u64();
  const sender = r.raw(20);
  const publicKey = r.option(() => r.raw(32));
  const gasLimit = r.u64();
  const maxFee = r.u128();
  const priorityFee = r.u128();
  const value = r.u128();
  const txKind = r.u8();
  const recipient = r.option(() => r.raw(20));
  const data = r.vecBytes();
  const signature = r.raw(64);
  r.expectEnd();
  return {
    version,
    chainId,
    nonce,
    sender,
    publicKey,
    gasLimit,
    maxFee,
    priorityFee,
    value,
    txKind,
    recipient,
    data,
    signature,
  };
}

/**
 * Hash canonique d'une transaction :
 *
 *   tx_hash = Keccak256("SANGO/TX/V1" || unsigned_bytes)
 */
export function transactionHash(tx: Transaction): Uint8Array {
  const unsigned = encodeUnsignedTransaction(tx);
  const payload = new Uint8Array(DOMAINS.TX_V1.length + unsigned.length);
  payload.set(DOMAINS.TX_V1, 0);
  payload.set(unsigned, DOMAINS.TX_V1.length);
  return keccak_256(payload);
}

// --- Helpers base units ----------------------------------------------------

/** 1 SANGO = 10 000 000 base units (V1, 7 décimales). */
export const BASE_UNITS_PER_SANGO = 10_000_000n;

export function sangoToBaseUnits(sango: bigint): bigint {
  return sango * BASE_UNITS_PER_SANGO;
}

export function baseUnitsToSango(baseUnits: bigint): bigint {
  return baseUnits / BASE_UNITS_PER_SANGO;
}
