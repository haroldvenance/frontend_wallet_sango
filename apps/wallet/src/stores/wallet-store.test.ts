import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Bip39Wallet, Wallet } from "@sango/wallet-core";

import { useWalletStore } from "./wallet-store";

const PERSIST_KEY = "sango.wallet-session.v1";

// Fake wallets minimaux — suffisants pour `unlock()` (pas de signature).
const fakeBip39Wallet = {
  destroy: vi.fn(),
} as unknown as Bip39Wallet;
const fakeSangoWallet = {
  destroy: vi.fn(),
} as unknown as Wallet;

beforeEach(() => {
  localStorage.clear();
  useWalletStore.setState({
    wallet: null,
    format: null,
    networkId: "sango-devnet",
    family: "sango",
    network: "testnet",
    status: "no-wallet",
    activeId: null,
  });
});

// ────────────────────────────────────────────────────────────
//  Persistance (D-E2.3-1)
// ────────────────────────────────────────────────────────────

describe("wallet-store — persistance", () => {
  it("persiste networkId après setNetworkId sur BIP-39", () => {
    useWalletStore.setState({ format: "bip39", status: "unlocked" });
    useWalletStore.getState().setNetworkId("bsc");

    const raw = localStorage.getItem(PERSIST_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as {
      state: Record<string, unknown>;
    };
    expect(parsed.state.networkId).toBe("bsc");
  });

  it("ne persiste QUE networkId (wallet/format/status/activeId absents)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      network: "testnet",
    });
    useWalletStore.getState().setNetworkId("bsc");

    const raw = localStorage.getItem(PERSIST_KEY);
    const parsed = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(parsed.state.wallet).toBeUndefined();
    expect(parsed.state.format).toBeUndefined();
    expect(parsed.state.status).toBeUndefined();
    expect(parsed.state.activeId).toBeUndefined();
    expect(parsed.state.network).toBeUndefined();
  });

  it("setNetworkId refuse un wallet non BIP-39", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useWalletStore.setState({ format: "sango-legacy" });
    useWalletStore.getState().setNetworkId("bsc");
    expect(useWalletStore.getState().networkId).not.toBe("bsc");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ────────────────────────────────────────────────────────────
//  Résolution à l'unlock (D-E2.3-1)
// ────────────────────────────────────────────────────────────

describe("wallet-store — resolveUnlockedNetworkId", () => {
  it("BIP-39 : préférence session valide gagne sur le keyring", () => {
    useWalletStore.setState({ networkId: "bsc" });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("bsc");
  });

  it("BIP-39 : préférence invalide (SANGO) → keyring", () => {
    useWalletStore.setState({ networkId: "sango-devnet" });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("ethereum-sepolia");
  });

  it("BIP-39 : préférence invalide (inconnu) → keyring", () => {
    useWalletStore.setState({ networkId: "unknown-evm-net" });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("ethereum-sepolia");
  });

  it("SANGO : préférence ignorée → keyring", () => {
    useWalletStore.setState({ networkId: "bsc" });
    useWalletStore.getState().unlock({
      wallet: fakeSangoWallet,
      id: "0xabc",
      format: "sango-legacy",
      networkId: "sango-devnet",
    });
    expect(useWalletStore.getState().networkId).toBe("sango-devnet");
  });

  it("INVARIANT : ethereum-sepolia n'est PAS un fallback (D-E2.3-1)", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    useWalletStore.setState({ networkId: "unknown-evm-1" });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "unknown-evm-2",
    });
    const resolved = useWalletStore.getState().networkId;
    // On garde le keyring invalide tel quel (erreur explicite loggée)
    // plutôt que de substituer silencieusement sepolia.
    expect(resolved).toBe("unknown-evm-2");
    expect(resolved).not.toBe("ethereum-sepolia");
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("BIP-39 : bascule entre 3 mainnets préservée par session", () => {
    useWalletStore.setState({ networkId: "arbitrum-one" });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("arbitrum-one");

    useWalletStore.setState({ networkId: "base" });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("base");
  });
});

// ────────────────────────────────────────────────────────────
//  E2.1.b.6.1 — family dérivée de networkId (D-E2.1-18)
// ────────────────────────────────────────────────────────────

describe("wallet-store — family", () => {
  it("unlock BIP-39 EVM → family=evm", () => {
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().family).toBe("evm");
  });

  it("unlock BIP-39 Bitcoin → family=bitcoin", () => {
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "bitcoin-testnet",
    });
    expect(useWalletStore.getState().family).toBe("bitcoin");
  });

  it("unlock SANGO → family=sango", () => {
    useWalletStore.getState().unlock({
      wallet: fakeSangoWallet,
      id: "0xabc",
      format: "sango-legacy",
      networkId: "sango-devnet",
    });
    expect(useWalletStore.getState().family).toBe("sango");
  });

  it("setNetworkId met à jour family dans le même set", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-sepolia",
      family: "evm",
    });
    useWalletStore.getState().setNetworkId("bitcoin-testnet");
    expect(useWalletStore.getState().networkId).toBe("bitcoin-testnet");
    expect(useWalletStore.getState().family).toBe("bitcoin");
  });

  it("préférence EVM ignorée pour un keyring Bitcoin", () => {
    // Store préférence = EVM, keyring = Bitcoin. Familles différentes
    // → préférence rejetée, family=bitcoin cohérent avec keyring.
    useWalletStore.setState({
      networkId: "ethereum-sepolia",
      family: "evm",
    });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "bitcoin-testnet",
    });
    expect(useWalletStore.getState().networkId).toBe("bitcoin-testnet");
    expect(useWalletStore.getState().family).toBe("bitcoin");
  });

  it("préférence Bitcoin ignorée pour un keyring EVM", () => {
    useWalletStore.setState({
      networkId: "bitcoin-testnet",
      family: "bitcoin",
    });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("ethereum-sepolia");
    expect(useWalletStore.getState().family).toBe("evm");
  });

  it("préférence mainnet EVM conservée pour un keyring EVM (D-E2.3-1)", () => {
    useWalletStore.setState({ networkId: "bsc", family: "evm" });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("bsc");
    expect(useWalletStore.getState().family).toBe("evm");
  });
});
