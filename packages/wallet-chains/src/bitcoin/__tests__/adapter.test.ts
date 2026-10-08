

// ────────────────────────────────────────────────────────────
//  Patch A.1 — addressProvider.deriveAddress (BIP-84 receive)
// ────────────────────────────────────────────────────────────

import { Bip39Wallet } from "@sango/wallet-core";
import { describe, it, expect } from "vitest";

import { bitcoinAdapterFactory } from "../adapter";
import { BITCOIN_MAINNET, BITCOIN_TESTNET } from "../config";

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";

function makeDeps(wallet: Bip39Wallet, btcNetwork: "testnet" | "mainnet") {
  return {
    rpc: {
      getUtxos: async () => [],
      getFeeRates: async () => ({ fast: 1n, normal: 1n, slow: 1n }),
      broadcastTx: async () => "",
    },
    changeProvider: {
      getChangeAddress: async () => ({
        address: btcNetwork === "mainnet" ? "bc1qfake" : "tb1qfake",
        script: new Uint8Array(22),
        derivationIndex: 0,
      }),
      commit: () => {},
      currentIndex: () => 0,
    },
    btcNetwork,
    wallet,
  };
}

describe("BitcoinAdapter — Patch A.1 addressProvider", () => {
  it("dérive l'adresse de réception BIP-84 testnet (m/84'/1'/0'/0/0)", async () => {
    const wallet = await Bip39Wallet.fromMnemonic(MNEMONIC);
    const adapter = bitcoinAdapterFactory(
      BITCOIN_TESTNET,
      makeDeps(wallet, "testnet"),
    );
    const address = await adapter.addressProvider.deriveAddress({
      family: "bitcoin",
      accountIndex: 0,
      networkId: "bitcoin-testnet",
    });
    // Vecteur BIP-84 officiel (mnemonic "abandon…")
    expect(address).toBe("tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl");
  });

  it("dérive une adresse différente pour accountIndex=1", async () => {
    const wallet = await Bip39Wallet.fromMnemonic(MNEMONIC);
    const adapter = bitcoinAdapterFactory(
      BITCOIN_TESTNET,
      makeDeps(wallet, "testnet"),
    );
    const a0 = await adapter.addressProvider.deriveAddress({
      family: "bitcoin",
      accountIndex: 0,
      networkId: "bitcoin-testnet",
    });
    const a1 = await adapter.addressProvider.deriveAddress({
      family: "bitcoin",
      accountIndex: 1,
      networkId: "bitcoin-testnet",
    });
    expect(a0).not.toBe(a1);
  });

  it("dérive l'adresse mainnet (bc1q…) pour le networkId mainnet", async () => {
    const wallet = await Bip39Wallet.fromMnemonic(MNEMONIC);
    const adapter = bitcoinAdapterFactory(
      BITCOIN_MAINNET,
      makeDeps(wallet, "mainnet"),
    );
    const address = await adapter.addressProvider.deriveAddress({
      family: "bitcoin",
      accountIndex: 0,
      networkId: "bitcoin-mainnet",
    });
    expect(address.startsWith("bc1q")).toBe(true);
  });

  it("refuse un account.networkId != adapter network", async () => {
    const wallet = await Bip39Wallet.fromMnemonic(MNEMONIC);
    const adapter = bitcoinAdapterFactory(
      BITCOIN_TESTNET,
      makeDeps(wallet, "testnet"),
    );
    await expect(
      adapter.addressProvider.deriveAddress({
        family: "bitcoin",
        accountIndex: 0,
        networkId: "bitcoin-mainnet", // mismatch
      }),
    ).rejects.toThrow(/does not match adapter network/);
  });

  it("validateAddress accepte tb1 sur testnet, rejette bc1", () => {
    const wallet = {} as Bip39Wallet;
    const adapter = bitcoinAdapterFactory(
      BITCOIN_TESTNET,
      makeDeps(wallet, "testnet"),
    );
    expect(adapter.addressProvider.validateAddress("tb1qabc")).toBe(true);
    expect(adapter.addressProvider.validateAddress("bc1qabc")).toBe(false);
  });
});
