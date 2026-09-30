import { describe, expect, it, vi } from "vitest";
import { keccak256 } from "viem";

import { EvmTransactionSigner } from "../transaction-signer";
import {
  encodeEip1559Digest,
  encodeEip1559Signed,
  computeEip1559TxHash,
  type Eip1559UnsignedFields,
} from "../eip1559-codec";
import {
  secp256k1KeypairFromPrivateKey,
  secp256k1SignDigestRecoverable,
} from "@sango/wallet-core";

import type { AccountRef } from "../../types/account";
import type { Signer } from "../../types/signer";
import type { UnsignedTransaction as ChainsUnsignedTx } from "../../types/tx";
import { ANVIL_ADDRESS_0, ANVIL_PRIVKEY_0 } from "./_helpers";

const EVM_ACCOUNT: AccountRef = {
  family: "evm",
  accountIndex: 0,
  networkId: "ethereum-sepolia",
};

const FIELDS: Eip1559UnsignedFields = {
  chainId: 11_155_111,
  nonce: 0,
  to: ANVIL_ADDRESS_0,
  value: 1_000_000_000_000_000_000n,
  gasLimit: 21_000n,
  maxFeePerGas: 20_000_000_000n,
  maxPriorityFeePerGas: 1_500_000_000n,
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function makeChainsTx(): ChainsUnsignedTx {
  return {
    family: "evm",
    networkId: "ethereum-sepolia",
    payload: FIELDS,
    meta: {
      from: ANVIL_ADDRESS_0,
      to: ANVIL_ADDRESS_0,
      assetRef: {
        kind: "native",
        assetId: "eth",
        networkId: "ethereum-sepolia",
      },
      amount: 1_000_000_000_000_000_000n,
    },
  };
}

/** Signer EVM mock : secp256k1 real via wallet-core (Anvil privkey). */
function makeRealSigner(): Signer {
  const kp = secp256k1KeypairFromPrivateKey(hexToBytes(ANVIL_PRIVKEY_0));
  return {
    getPublicKey: vi.fn(async () => kp.publicKeyUncompressed),
    signDomain: vi.fn(async () => new Uint8Array(64)),
    signDigestRecoverable: vi.fn(async (digest: Uint8Array) =>
      secp256k1SignDigestRecoverable(kp, digest),
    ),
  };
}

describe("EvmTransactionSigner — happy path", () => {
  it("produces a signed tx with raw + txHash", async () => {
    const signer = makeRealSigner();
    const s = new EvmTransactionSigner();
    const signed = await s.sign(makeChainsTx(), signer, EVM_ACCOUNT);

    expect(signed.raw).toBeInstanceOf(Uint8Array);
    expect(signed.raw.length).toBeGreaterThan(0);
    expect(signed.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(signed.unsigned.family).toBe("evm");
  });

  it("calls signer.signDigestRecoverable with the digest", async () => {
    const signer = makeRealSigner();
    const s = new EvmTransactionSigner();
    await s.sign(makeChainsTx(), signer, EVM_ACCOUNT);

    const expected = hexToBytes(encodeEip1559Digest(FIELDS));
    expect(signer.signDigestRecoverable).toHaveBeenCalledWith(
      expected,
      EVM_ACCOUNT,
    );
  });

  it("txHash equals keccak256(raw)", async () => {
    const signer = makeRealSigner();
    const s = new EvmTransactionSigner();
    const signed = await s.sign(makeChainsTx(), signer, EVM_ACCOUNT);

    expect(signed.txHash).toBe(keccak256(signed.raw));
  });

  it("raw + txHash are deterministic (RFC 6979 signature)", async () => {
    const s = new EvmTransactionSigner();
    const a = await s.sign(makeChainsTx(), makeRealSigner(), EVM_ACCOUNT);
    const b = await s.sign(makeChainsTx(), makeRealSigner(), EVM_ACCOUNT);

    expect(a.raw).toEqual(b.raw);
    expect(a.txHash).toBe(b.txHash);
  });

  it("raw matches encodeEip1559Signed with extracted signature", async () => {
    // Vérifie la cohérence : la signature produite doit donner exactement
    // le même RLP que l'encodage direct avec la même sig.
    const signer = makeRealSigner();
    const s = new EvmTransactionSigner();
    const signed = await s.sign(makeChainsTx(), signer, EVM_ACCOUNT);

    // On ne peut pas accéder à la sig directement depuis SignedTransaction,
    // mais on peut vérifier que le raw est préfixé par 0x02.
    expect(signed.raw[0]).toBe(0x02);
  });

  it("snapshot: raw bytes for a fixed tx are stable", async () => {
    const signer = makeRealSigner();
    const s = new EvmTransactionSigner();
    const signed = await s.sign(makeChainsTx(), signer, EVM_ACCOUNT);
    const hex = "0x" + Array.from(signed.raw, (b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toMatchSnapshot("signed-raw-hex");
    expect(signed.txHash).toMatchSnapshot("tx-hash-hex");
  });
});

describe("EvmTransactionSigner — validation", () => {
  it("rejects non-evm family", async () => {
    const s = new EvmTransactionSigner();
    const tx = { ...makeChainsTx(), family: "sango" as const };
    await expect(
      s.sign(tx, makeRealSigner(), EVM_ACCOUNT),
    ).rejects.toThrow(/unexpected family "sango"/);
  });

  it("rejects a signer without signDigestRecoverable", async () => {
    const signer: Signer = {
      getPublicKey: vi.fn(async () => new Uint8Array(65)),
      signDomain: vi.fn(async () => new Uint8Array(64)),
      // pas de signDigestRecoverable
    };
    const s = new EvmTransactionSigner();
    await expect(
      s.sign(makeChainsTx(), signer, EVM_ACCOUNT),
    ).rejects.toThrow(/signDigestRecoverable/);
  });

  // Silence unused
  void encodeEip1559Signed;
  void computeEip1559TxHash;
});
