import { describe, expect, it } from "vitest";

import { Bip39Wallet, bip39WalletFromMnemonicSync } from "../bip39-wallet";

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";
const HARDHAT_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

function toHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("Bip39Wallet — construction", () => {
  it("fromMnemonic derives the Hardhat/Anvil #0 address", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    expect(w.defaultAddress).toBe(HARDHAT_ADDRESS_0);
  });

  it("bip39WalletFromMnemonicSync matches the async variant", async () => {
    const a = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const b = bip39WalletFromMnemonicSync(HARDHAT_MNEMONIC);
    expect(a.defaultAddress).toBe(b.defaultAddress);
  });

  it("generate() returns a wallet + a valid mnemonic", async () => {
    const { wallet, mnemonic } = await Bip39Wallet.generate();
    expect(mnemonic.split(" ")).toHaveLength(12);
    expect(wallet.defaultAddress).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it("getIdentity(0) exposes the default path", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const id = w.getIdentity(0);
    expect(id.index).toBe(0);
    expect(id.path).toBe("m/44'/60'/0'/0/0");
    expect(id.publicKeyCompressed).toHaveLength(33);
    expect(id.addressHex).toBe(HARDHAT_ADDRESS_0);
  });

  it("getIdentity(1) derives a distinct address", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const id0 = w.getIdentity(0);
    const id1 = w.getIdentity(1);
    expect(id0.addressHex).not.toBe(id1.addressHex);
    expect(id1.path).toBe("m/44'/60'/0'/0/1");
  });

  it("the mnemonic is NOT accessible from the wallet", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    // Aucune méthode de l'API ne doit retourner la mnemonic.
    const proto = Object.getPrototypeOf(w) as Record<string, unknown>;
    const own = Object.getOwnPropertyNames(w);
    const methods = [...Object.getOwnPropertyNames(proto), ...own];
    // `getMnemonic` ne doit pas exister
    expect(methods).not.toContain("getMnemonic");
    expect(methods).not.toContain("mnemonic");
    expect(methods).not.toContain("seed");
    // La valeur hex de la mnemonic ne doit jamais apparaître dans un toJSON
    expect(typeof (w as { toJSON?: unknown }).toJSON).not.toBe("function");
  });
});

describe("Bip39Wallet — signature", () => {
  it("signDomain produces a 64-byte signature", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const domain = new Uint8Array(0);
    const payload = new TextEncoder().encode("hello");
    const sig = await w.signDomain(domain, payload);
    expect(sig).toHaveLength(64);
  });

  it("signDomain is deterministic (same inputs → same signature)", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const d = new Uint8Array([1, 2, 3]);
    const p = new Uint8Array([4, 5, 6]);
    const a = await w.signDomain(d, p);
    const b = await w.signDomain(d, p);
    expect(a).toEqual(b);
  });

  it("signDigest signs a 32-byte digest deterministically", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const digest = new Uint8Array(32).fill(0xab);
    const a = await w.signDigest(digest);
    const b = await w.signDigest(digest);
    expect(a).toEqual(b);
    expect(a).toHaveLength(64);
  });

  it("signDigest rejects a non-32-byte digest", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    await expect(w.signDigest(new Uint8Array(31))).rejects.toThrow(
      /digest must be 32 bytes/,
    );
  });

  it("signDomain with different indices produces different signatures", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const d = new Uint8Array([1]);
    const p = new Uint8Array([2]);
    const a = await w.signDomain(d, p, 0);
    const b = await w.signDomain(d, p, 1);
    expect(toHex(a)).not.toBe(toHex(b));
  });
});

describe("Bip39Wallet — lifecycle", () => {
  it("destroy() wipes the seed (subsequent signing fails)", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    w.destroy();
    expect(w.isDestroyed).toBe(true);
    await expect(
      w.signDomain(new Uint8Array(), new Uint8Array()),
    ).rejects.toThrow(/destroyed/);
    await expect(w.signDigest(new Uint8Array(32))).rejects.toThrow(/destroyed/);
  });
});
