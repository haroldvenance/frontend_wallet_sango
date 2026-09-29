import { describe, expect, it } from "vitest";
import { restoreWallet } from "@sango/wallet-core";
import { signerFromWallet } from "../signer";
import type { AccountRef } from "@sango/wallet-chains";

const SEED = new Uint8Array(32).fill(0x55);
const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

describe("signerFromWallet", () => {
  it("getPublicKey returns the wallet's public key", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const s = signerFromWallet(w);
    const pk = await s.getPublicKey(ACCOUNT);
    // Golden vector wallet-core.
    expect(pk).toEqual(w.identity.publicKey);
    expect(pk).toHaveLength(32);
  });

  it("signDomain produces a signature verifiable via wallet-core", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const s = signerFromWallet(w);
    const domain = new TextEncoder().encode("SANGO/TEST/V1");
    const payload = new Uint8Array([1, 2, 3]);
    const sig = await s.signDomain(domain, payload, ACCOUNT);
    expect(sig).toHaveLength(64);
    const ok = await w.verifyOwnSignature(domain, payload, sig);
    expect(ok).toBe(true);
  });

  it("signDomain is deterministic", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const s = signerFromWallet(w);
    const d = new Uint8Array(8);
    const p = new Uint8Array([42]);
    const a = await s.signDomain(d, p, ACCOUNT);
    const b = await s.signDomain(d, p, ACCOUNT);
    expect(a).toEqual(b);
  });
});
