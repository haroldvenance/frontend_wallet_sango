import { describe, expect, it } from "vitest";
import {
  Bip39Wallet,
  deriveEthereumAddress,
  restoreWallet,
} from "@sango/wallet-core";

import type { AccountRef } from "@sango/wallet-chains";
import {
  signerFromAnyWallet,
  signerFromBip39Wallet,
  signerFromWallet,
} from "../signer";

const SANGO_SEED = new Uint8Array(32).fill(0x55);
const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

const SANGO_ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

const EVM_ACCOUNT: AccountRef = {
  family: "evm",
  accountIndex: 0,
  networkId: "ethereum-sepolia",
};

function toHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("signerFromWallet (legacy SANGO)", () => {
  it("getPublicKey returns 32-byte Ed25519 pubkey for family sango", async () => {
    const w = await restoreWallet(SANGO_SEED, "testnet");
    const s = signerFromWallet(w);
    const pk = await s.getPublicKey(SANGO_ACCOUNT);
    expect(pk).toHaveLength(32);
  });

  it("rejects family evm (SANGO-only)", async () => {
    const w = await restoreWallet(SANGO_SEED, "testnet");
    const s = signerFromWallet(w);
    await expect(s.getPublicKey(EVM_ACCOUNT)).rejects.toThrow(
      /family is "evm" but this signer only handles "sango"/,
    );
  });

  it("signDomain rejects family evm", async () => {
    const w = await restoreWallet(SANGO_SEED, "testnet");
    const s = signerFromWallet(w);
    await expect(
      s.signDomain(new Uint8Array(), new Uint8Array(), EVM_ACCOUNT),
    ).rejects.toThrow(/family is "evm"/);
  });

  it("has no signDigestRecoverable (Ed25519 has no recovery bit)", async () => {
    const w = await restoreWallet(SANGO_SEED, "testnet");
    const s = signerFromWallet(w);
    expect(s.signDigestRecoverable).toBeUndefined();
  });
});

describe("signerFromBip39Wallet (EVM)", () => {
  it("getPublicKey returns 65-byte uncompressed pubkey", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromBip39Wallet(w);
    const pk = await s.getPublicKey(EVM_ACCOUNT);
    expect(pk).toHaveLength(65);
    expect(pk[0]).toBe(0x04);
  });

  it("getPublicKey derives the correct Ethereum address", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromBip39Wallet(w);
    const pk = await s.getPublicKey(EVM_ACCOUNT);
    const addr = deriveEthereumAddress(pk);
    expect(toHex(addr)).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
  });

  it("rejects family sango (E1 doesn't derive SANGO via BIP-44)", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromBip39Wallet(w);
    await expect(s.getPublicKey(SANGO_ACCOUNT)).rejects.toThrow(
      /family is "sango" but this signer only handles "evm"/,
    );
  });

  it("signDigestRecoverable returns compact + recovery", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromBip39Wallet(w);
    const digest = new Uint8Array(32).fill(0x42);
    const sig = await s.signDigestRecoverable!(digest, EVM_ACCOUNT);
    expect(sig.compact).toHaveLength(64);
    expect([0, 1]).toContain(sig.recovery);
  });

  it("signDigestRecoverable rejects family sango", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromBip39Wallet(w);
    await expect(
      s.signDigestRecoverable!(new Uint8Array(32), SANGO_ACCOUNT),
    ).rejects.toThrow(/family is "sango"/);
  });

  it("signDomain derives for the requested BIP-44 index", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromBip39Wallet(w);
    const domain = new Uint8Array([1, 2, 3]);
    const payload = new Uint8Array([4, 5, 6]);
    const sig0 = await s.signDomain(domain, payload, {
      ...EVM_ACCOUNT,
      accountIndex: 0,
    });
    const sig1 = await s.signDomain(domain, payload, {
      ...EVM_ACCOUNT,
      accountIndex: 1,
    });
    expect(sig0).not.toEqual(sig1);
  });
});

describe("signerFromAnyWallet (dispatch)", () => {
  it("dispatches legacy SANGO Wallet", async () => {
    const w = await restoreWallet(SANGO_SEED, "testnet");
    const s = signerFromAnyWallet(w);
    const pk = await s.getPublicKey(SANGO_ACCOUNT);
    expect(pk).toHaveLength(32);
  });

  it("dispatches Bip39Wallet", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromAnyWallet(w);
    const pk = await s.getPublicKey(EVM_ACCOUNT);
    expect(pk).toHaveLength(65);
  });

  it("SANGO wallet still rejects EVM account through dispatch", async () => {
    const w = await restoreWallet(SANGO_SEED, "testnet");
    const s = signerFromAnyWallet(w);
    await expect(s.getPublicKey(EVM_ACCOUNT)).rejects.toThrow(
      /family is "evm"/,
    );
  });

  it("EVM wallet still rejects SANGO account through dispatch", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const s = signerFromAnyWallet(w);
    await expect(s.getPublicKey(SANGO_ACCOUNT)).rejects.toThrow(
      /family is "sango"/,
    );
  });
});
