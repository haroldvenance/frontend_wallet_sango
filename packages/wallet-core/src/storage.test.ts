import { describe, expect, it } from "vitest";

import { restoreWallet, Wallet } from "./wallet";

const SEED = new Uint8Array(32).fill(0x55);

describe("Wallet encrypted storage", () => {
  it("round-trips with correct password", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const stored = await w.exportEncrypted("correct horse battery staple");
    expect(stored.version).toBe(1);
    expect(stored.network).toBe("testnet");
    expect(stored.addressHex).toBe(
      "0x02291e07839d715a4c78b8585449b7e367aa01ab",
    );

    const restored = await Wallet.importEncrypted(
      stored,
      "correct horse battery staple",
    );
    expect(restored.identity.addressHex).toBe(w.identity.addressHex);
  });

  it("rejects a wrong password", async () => {
    const w = await restoreWallet(SEED);
    const stored = await w.exportEncrypted("password-one-1234");
    await expect(
      Wallet.importEncrypted(stored, "password-two-1234"),
    ).rejects.toThrow();
  });

  it("rejects a short password", async () => {
    const w = await restoreWallet(SEED);
    await expect(w.exportEncrypted("short")).rejects.toThrow();
  });
});
