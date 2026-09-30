import { describe, expect, it } from "vitest";
import { keccak256 } from "viem";

import {
  compactToEip1559Signature,
  computeEip1559TxHash,
  encodeEip1559Digest,
  encodeEip1559Signed,
  type Eip1559UnsignedFields,
} from "../eip1559-codec";
import type { Address, Hash } from "../../types/address";

function toHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const ADDR_TO = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as Address;
const ADDR_TO_2 = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as Address;

const FIELDS: Eip1559UnsignedFields = {
  chainId: 11155111, // Sepolia
  nonce: 0,
  to: ADDR_TO,
  value: 1_000_000_000_000_000_000n, // 1 ETH
  gasLimit: 21_000n,
  maxFeePerGas: 20_000_000_000n, // 20 gwei
  maxPriorityFeePerGas: 1_500_000_000n, // 1.5 gwei
};

const SIG: { r: Hash; s: Hash; yParity: 0 | 1 } = {
  r: "0x1111111111111111111111111111111111111111111111111111111111111111",
  s: "0x2222222222222222222222222222222222222222222222222222222222222222",
  yParity: 1,
};

describe("eip1559-codec — digest", () => {
  it("encodeEip1559Digest returns a 32-byte hash", () => {
    const digest = encodeEip1559Digest(FIELDS);
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("digest is deterministic", () => {
    expect(encodeEip1559Digest(FIELDS)).toBe(encodeEip1559Digest(FIELDS));
  });

  it("digest changes when a field changes", () => {
    const d1 = encodeEip1559Digest(FIELDS);
    const d2 = encodeEip1559Digest({ ...FIELDS, nonce: 1 });
    expect(d1).not.toBe(d2);
  });

  it("supports no `to` (contract deployment)", () => {
    const { to, ...noTo } = FIELDS;
    void to;
    const d = encodeEip1559Digest(noTo);
    expect(d).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("supports no `data`", () => {
    const d = encodeEip1559Digest(FIELDS);
    expect(d).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("supports explicit `data`", () => {
    const d = encodeEip1559Digest({
      ...FIELDS,
      data: "0xdeadbeef" as Hash,
    });
    expect(d).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("eip1559-codec — signed RLP", () => {
  it("returns a 0x02-prefixed raw tx", () => {
    const raw = encodeEip1559Signed(FIELDS, SIG);
    expect(raw.startsWith("0x02")).toBe(true);
  });

  it("is deterministic given fields + sig", () => {
    const a = encodeEip1559Signed(FIELDS, SIG);
    const b = encodeEip1559Signed(FIELDS, SIG);
    expect(a).toBe(b);
  });

  it("yParity changes the raw bytes", () => {
    const raw0 = encodeEip1559Signed(FIELDS, { ...SIG, yParity: 0 });
    const raw1 = encodeEip1559Signed(FIELDS, { ...SIG, yParity: 1 });
    expect(raw0).not.toBe(raw1);
  });

  it("r changes the raw bytes", () => {
    const rawA = encodeEip1559Signed(FIELDS, SIG);
    const rawB = encodeEip1559Signed(FIELDS, {
      ...SIG,
      r: "0x3333333333333333333333333333333333333333333333333333333333333333" as Hash,
    });
    expect(rawA).not.toBe(rawB);
  });
});

describe("eip1559-codec — txHash", () => {
  it("computeEip1559TxHash = keccak256(raw)", () => {
    const raw = encodeEip1559Signed(FIELDS, SIG);
    const expected = keccak256(raw);
    expect(computeEip1559TxHash(FIELDS, SIG)).toBe(expected);
  });

  it("txHash is 32-byte hex", () => {
    expect(computeEip1559TxHash(FIELDS, SIG)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("txHash is deterministic", () => {
    expect(computeEip1559TxHash(FIELDS, SIG)).toBe(
      computeEip1559TxHash(FIELDS, SIG),
    );
  });
});

describe("eip1559-codec — snapshot", () => {
  it("raw RLP bytes for a fixed tx are stable", () => {
    const raw = encodeEip1559Signed(FIELDS, SIG);
    expect(raw).toMatchSnapshot("raw-1559-hex");

    const digest = encodeEip1559Digest(FIELDS);
    expect(digest).toMatchSnapshot("unsigned-digest-hex");

    const hash = computeEip1559TxHash(FIELDS, SIG);
    expect(hash).toMatchSnapshot("tx-hash-hex");
  });
});

describe("compactToEip1559Signature", () => {
  it("splits 64-byte compact + recovery into r/s/yParity", () => {
    const compact = new Uint8Array(64);
    for (let i = 0; i < 32; i += 1) compact[i] = 0x11;
    for (let i = 32; i < 64; i += 1) compact[i] = 0x22;

    const sig = compactToEip1559Signature(compact, 1);
    expect(sig.r).toBe(
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    );
    expect(sig.s).toBe(
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    );
    expect(sig.yParity).toBe(1);
  });

  it("respects yParity=0", () => {
    const compact = new Uint8Array(64).fill(0xaa);
    const sig = compactToEip1559Signature(compact, 0);
    expect(sig.yParity).toBe(0);
  });

  it("rejects wrong compact length", () => {
    expect(() =>
      compactToEip1559Signature(new Uint8Array(63), 1),
    ).toThrow(/64 bytes/);
  });

  it("pads r/s to exactly 32 bytes", () => {
    // compact commençant par 0x00 → le r doit garder la longueur 32
    const compact = new Uint8Array(64);
    compact[0] = 0x00;
    compact[1] = 0x01;
    const sig = compactToEip1559Signature(compact, 0);
    expect(sig.r).toHaveLength(66); // 0x + 64 hex chars
  });

  it("integrates with encodeEip1559Signed (real flow)", () => {
    const compact = new Uint8Array(64);
    for (let i = 0; i < 64; i += 1) compact[i] = i;
    const sig = compactToEip1559Signature(compact, 1);

    const raw = encodeEip1559Signed(FIELDS, sig);
    expect(raw.startsWith("0x02")).toBe(true);
  });

  // Silence unused warning
  void toHex;
  void ADDR_TO_2;
});
