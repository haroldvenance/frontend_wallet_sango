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
    walletAccounts: {},
  });
});

// ────────────────────────────────────────────────────────────
//  Persistance (D-E2.3-1)
// ────────────────────────────────────────────────────────────

describe("wallet-store — persistance", () => {
  it("persiste networkId après setNetworkId sur BIP-39", () => {
    // On part d'un EVM (family:"evm") pour que le switch intra-famille
    // vers "bsc" soit autorisé par le garde-fou D-E2.1-23.
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-sepolia",
      family: "evm",
    });
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

  it("setNetworkId : switch EVM intra-famille conserve family=evm", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-sepolia",
      family: "evm",
    });
    useWalletStore.getState().setNetworkId("bsc");
    expect(useWalletStore.getState().networkId).toBe("bsc");
    expect(useWalletStore.getState().family).toBe("evm");
  });

  it("setNetworkId : switch Bitcoin intra-famille conserve family=bitcoin", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bitcoin-testnet",
      family: "bitcoin",
    });
    useWalletStore.getState().setNetworkId("bitcoin-mainnet");
    expect(useWalletStore.getState().networkId).toBe("bitcoin-mainnet");
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

// ────────────────────────────────────────────────────────────
//  E2.1.b.7.b — garde-fou cross-family sur setNetworkId (D-E2.1-23)
// ────────────────────────────────────────────────────────────

describe("wallet-store — setNetworkId cross-family", () => {
  it("accepte un changement intra-famille Bitcoin (testnet → mainnet)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bitcoin-testnet",
      family: "bitcoin",
    });
    useWalletStore.getState().setNetworkId("bitcoin-mainnet");
    expect(useWalletStore.getState().networkId).toBe("bitcoin-mainnet");
    expect(useWalletStore.getState().family).toBe("bitcoin");
  });

  it("accepte un changement intra-famille EVM (sepolia → bsc)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-sepolia",
      family: "evm",
    });
    useWalletStore.getState().setNetworkId("bsc");
    expect(useWalletStore.getState().networkId).toBe("bsc");
    expect(useWalletStore.getState().family).toBe("evm");
  });

  it("refuse Bitcoin → EVM", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bitcoin-testnet",
      family: "bitcoin",
    });
    useWalletStore.getState().setNetworkId("ethereum-sepolia");
    expect(useWalletStore.getState().networkId).toBe("bitcoin-testnet");
    expect(useWalletStore.getState().family).toBe("bitcoin");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("cross-family"),
    );
    warn.mockRestore();
  });

  it("refuse EVM → Bitcoin", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-mainnet",
      family: "evm",
    });
    useWalletStore.getState().setNetworkId("bitcoin-mainnet");
    expect(useWalletStore.getState().networkId).toBe("ethereum-mainnet");
    expect(useWalletStore.getState().family).toBe("evm");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("cross-family"),
    );
    warn.mockRestore();
  });
});

// ────────────────────────────────────────────────────────────
//  Phase 2.3 — walletAccounts + setAccountIndex + addAccount
// ────────────────────────────────────────────────────────────

describe("wallet-store — walletAccounts", () => {
  it("unlock initialise walletAccounts[activeId] si absent", () => {
    useWalletStore.setState({ walletAccounts: {} });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xnew",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().walletAccounts["0xnew"]).toEqual({
      highestIndex: 0,
      activeIndex: 0,
    });
  });

  it("unlock préserve walletAccounts[activeId] existant", () => {
    useWalletStore.setState({
      walletAccounts: { "0xnew": { highestIndex: 2, activeIndex: 1 } },
    });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xnew",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().walletAccounts["0xnew"]).toEqual({
      highestIndex: 2,
      activeIndex: 1,
    });
  });

  it("setAccountIndex : 0 <= index <= highestIndex", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xw",
      walletAccounts: { "0xw": { highestIndex: 2, activeIndex: 0 } },
    });
    useWalletStore.getState().setAccountIndex(2);
    expect(
      useWalletStore.getState().walletAccounts["0xw"]!.activeIndex,
    ).toBe(2);
  });

  it("setAccountIndex refuse index > highestIndex", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xw",
      walletAccounts: { "0xw": { highestIndex: 1, activeIndex: 0 } },
    });
    useWalletStore.getState().setAccountIndex(5);
    expect(
      useWalletStore.getState().walletAccounts["0xw"]!.activeIndex,
    ).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("setAccountIndex refuse index négatif", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xw",
      walletAccounts: { "0xw": { highestIndex: 1, activeIndex: 0 } },
    });
    useWalletStore.getState().setAccountIndex(-1);
    expect(
      useWalletStore.getState().walletAccounts["0xw"]!.activeIndex,
    ).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("setAccountIndex refuse SANGO legacy", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useWalletStore.setState({
      format: "sango-legacy",
      status: "unlocked",
      activeId: "0xsango",
      walletAccounts: { "0xsango": { highestIndex: 0, activeIndex: 0 } },
    });
    useWalletStore.getState().setAccountIndex(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('expected "bip39"'),
    );
    warn.mockRestore();
  });

  it("addAccount incrémente highestIndex + activeIndex", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xw",
      walletAccounts: { "0xw": { highestIndex: 0, activeIndex: 0 } },
    });
    useWalletStore.getState().addAccount();
    expect(useWalletStore.getState().walletAccounts["0xw"]).toEqual({
      highestIndex: 1,
      activeIndex: 1,
    });
  });

  it("addAccount refuse SANGO legacy", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useWalletStore.setState({
      format: "sango-legacy",
      status: "unlocked",
      activeId: "0xsango",
      walletAccounts: { "0xsango": { highestIndex: 0, activeIndex: 0 } },
    });
    useWalletStore.getState().addAccount();
    expect(useWalletStore.getState().walletAccounts["0xsango"]).toEqual({
      highestIndex: 0,
      activeIndex: 0,
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("invariant : switch n'affecte pas highestIndex", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xw",
      walletAccounts: { "0xw": { highestIndex: 3, activeIndex: 3 } },
    });
    useWalletStore.getState().setAccountIndex(1);
    const s = useWalletStore.getState().walletAccounts["0xw"]!;
    expect(s.highestIndex).toBe(3);
    expect(s.activeIndex).toBe(1);
  });
});
