import { asAddress } from "../../types/address";
import { describe, expect, it, vi } from "vitest";
import { SangoTransactionSigner } from "../transaction-signer";
import { mockSigner } from "./_helpers";
import type { AccountRef } from "../../types/account";
import type { UnsignedTransaction } from "../../types/tx";
import { DOMAINS, transactionHash } from "@sango/wallet-core";

const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

function unsigned(): UnsignedTransaction {
  return {
    family: "sango",
    networkId: "sango-devnet",
    payload: {
      version: 1,
      chainId: new Uint8Array(32).fill(0x11),
      nonce: 0n,
      sender: new Uint8Array(20).fill(0xaa),
      publicKey: null,
      gasLimit: 21_000n,
      maxFee: 20n,
      priorityFee: 2n,
      value: 1000n,
      txKind: 1,
      recipient: new Uint8Array(20).fill(0xbb),
      data: new Uint8Array(0),
    },
    meta: {
      from: asAddress("aa".repeat(20)),
      to: asAddress("bb".repeat(20)),
      assetRef: { kind: "native", assetId: "sango", networkId: "sango-devnet" },
      amount: 1000n,
    },
  };
}

describe("SangoTransactionSigner", () => {
  it("signs the tx with DOMAINS.TX_V1 and returns 211-byte raw + 32-byte hash", async () => {
    const s = new SangoTransactionSigner();
    const signer = mockSigner();
    const signed = await s.sign(unsigned(), signer, ACCOUNT);

    // Vérifie que le signer a bien reçu le domain TX_V1.
    const [domainArg, payloadArg, accountArg] = (signer.signDomain as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(domainArg).toEqual(DOMAINS.TX_V1);
    expect(payloadArg.length).toBe(147);
    expect(accountArg).toBe(ACCOUNT);

    // raw = unsigned(147) + signature(64)
    expect(signed.raw.length).toBe(211);
    expect(signed.txHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("txHash is deterministic and matches local computation", async () => {
    const s = new SangoTransactionSigner();
    const signer = mockSigner();
    const u = unsigned();
    const signed = await s.sign(u, signer, ACCOUNT);

    // Recalcule localement (via wallet-core) avec la même signature.
    const sig = new Uint8Array(64).fill(0xff);
    const localHash = "0x" + Array.from(
      transactionHash({ ...(u.payload as Record<string, unknown>), signature: sig } as never),
    ).map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(signed.txHash).toBe(localHash);
  });

  it("rejects non-sango families", async () => {
    const s = new SangoTransactionSigner();
    const bad = { ...unsigned(), family: "evm" as const };
    await expect(s.sign(bad, mockSigner(), ACCOUNT)).rejects.toThrow(/unexpected family/);
  });
});