import { describe, expect, it } from "vitest";

import { DOMAINS, signNative, verifyNative } from "./signing";
import { keypairFromSeed } from "./keypair";

describe("signNative / verifyNative", () => {
  const seed = new Uint8Array(32).fill(0x42);

  it("round-trips a signature", async () => {
    const kp = await keypairFromSeed(seed);
    const sig = await signNative(kp.secretKey, DOMAINS.TX_V1, new Uint8Array([1, 2, 3]));
    expect(
      await verifyNative(kp.publicKey, DOMAINS.TX_V1, new Uint8Array([1, 2, 3]), sig),
    ).toBe(true);
  });

  it("rejects a wrong domain", async () => {
    const kp = await keypairFromSeed(seed);
    const sig = await signNative(kp.secretKey, DOMAINS.TX_V1, new Uint8Array());
    expect(
      await verifyNative(kp.publicKey, DOMAINS.PREVOTE_V1, new Uint8Array(), sig),
    ).toBe(false);
  });

  it("rejects a tampered payload", async () => {
    const kp = await keypairFromSeed(seed);
    const sig = await signNative(kp.secretKey, DOMAINS.TX_V1, new Uint8Array([1]));
    expect(
      await verifyNative(kp.publicKey, DOMAINS.TX_V1, new Uint8Array([2]), sig),
    ).toBe(false);
  });

  it("is deterministic", async () => {
    const kp = await keypairFromSeed(seed);
    const a = await signNative(kp.secretKey, DOMAINS.TX_V1, new Uint8Array());
    const b = await signNative(kp.secretKey, DOMAINS.TX_V1, new Uint8Array());
    expect(a).toEqual(b);
  });
});
