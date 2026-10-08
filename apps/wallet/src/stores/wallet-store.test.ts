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
    wallets: {},
    wallet: null,
    format: null,
    networkId: "sango-devnet",
    family: "sango",
    network: "testnet",
    status: "no-wallet",
    activeId: null,
    walletAccounts: {},
    walletNetworks: {},
  });
});

// ────────────────────────────────────────────────────────────
//  Persistance (D-E2.3-1)
// ────────────────────────────────────────────────────────────

describe("wallet-store — persistance", () => {
  it("persiste walletNetworks après setNetworkId sur BIP-39", () => {
    // On part d'un EVM (family:"evm") avec un activeId pour que
    // setNetworkId persiste dans walletNetworks[activeId].
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "ethereum-sepolia",
      family: "evm",
      walletNetworks: { "0xabc": "ethereum-sepolia" },
    });
    useWalletStore.getState().setNetworkId("bsc");

    const raw = localStorage.getItem(PERSIST_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as {
      state: Record<string, unknown>;
    };
    const walletNetworks = parsed.state.walletNetworks as Record<
      string,
      string
    >;
    expect(walletNetworks["0xabc"]).toBe("bsc");
  });

  it("ne persiste QUE les préférences (secrets runtime absents)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      network: "testnet",
      networkId: "ethereum-sepolia",
      family: "evm",
      walletNetworks: { "0xabc": "ethereum-sepolia" },
    });
    useWalletStore.getState().setNetworkId("bsc");

    const raw = localStorage.getItem(PERSIST_KEY);
    const parsed = JSON.parse(raw!) as { state: Record<string, unknown> };
    // Runtime — jamais persisté
    expect(parsed.state.wallets).toBeUndefined();
    expect(parsed.state.wallet).toBeUndefined();
    expect(parsed.state.format).toBeUndefined();
    expect(parsed.state.status).toBeUndefined();
    expect(parsed.state.network).toBeUndefined();
    expect(parsed.state.family).toBeUndefined();
    expect(parsed.state.networkId).toBeUndefined();
    // Préférences — persistées (D-Phase3-1)
    expect(parsed.state.activeId).toBe("0xabc");
    expect(parsed.state.walletAccounts).toEqual({});
    expect(parsed.state.walletNetworks).toEqual({ "0xabc": "bsc" });
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
  it("BIP-39 : préférence valide gagne sur le keyring", () => {
    useWalletStore.setState({ walletNetworks: { "0xabc": "bsc" } });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("bsc");
  });

  it("BIP-39 : préférence cross-family (SANGO) → keyring", () => {
    useWalletStore.setState({
      walletNetworks: { "0xabc": "sango-devnet" },
    });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("ethereum-sepolia");
  });

  it("BIP-39 : préférence inconnue → keyring", () => {
    useWalletStore.setState({
      walletNetworks: { "0xabc": "unknown-evm-net" },
    });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("ethereum-sepolia");
  });

  it("SANGO : préférence ignorée → keyring", () => {
    useWalletStore.setState({
      walletNetworks: { "0xabc": "bsc" },
    });
    useWalletStore.getState().unlock({
      wallet: fakeSangoWallet,
      id: "0xabc",
      format: "sango-legacy",
      networkId: "sango-devnet",
    });
    expect(useWalletStore.getState().networkId).toBe("sango-devnet");
  });

  it("INVARIANT : ethereum-sepolia n'est PAS un fallback (D-E2.3-1)", () => {
    // Préférence inconnue + keyring inconnu : le keyring reste tel quel,
    // aucun fallback silencieux vers sepolia.
    useWalletStore.setState({
      walletNetworks: { "0xabc": "unknown-evm-1" },
    });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "unknown-evm-2",
    });
    const resolved = useWalletStore.getState().networkId;
    expect(resolved).toBe("unknown-evm-2");
    expect(resolved).not.toBe("unknown-evm-1");
    expect(resolved).not.toBe("ethereum-sepolia");
  });

  it("BIP-39 : bascule entre 3 mainnets préservée par session", () => {
    useWalletStore.setState({
      walletNetworks: { "0xabc": "arbitrum-one" },
    });
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xabc",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    expect(useWalletStore.getState().networkId).toBe("arbitrum-one");

    useWalletStore.setState({
      walletNetworks: { "0xabc": "base" },
    });
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
    // Préférence = EVM, keyring = Bitcoin. Familles différentes
    // → préférence rejetée, family=bitcoin cohérent avec keyring.
    useWalletStore.setState({
      walletNetworks: { "0xabc": "ethereum-sepolia" },
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
      walletNetworks: { "0xabc": "bitcoin-testnet" },
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
    useWalletStore.setState({
      walletNetworks: { "0xabc": "bsc" },
    });
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

// ────────────────────────────────────────────────────────────
//  Phase 3.1 — multi-wallet keyring
// ────────────────────────────────────────────────────────────

describe("wallet-store — Phase 3.1 (multi-wallet)", () => {
  function makeArg(id: string, networkId: string, label: string) {
    return {
      id,
      wallet: fakeBip39Wallet,
      format: "bip39" as const,
      networkId,
      label,
      createdAt: Date.now(),
    };
  }

  it("unlock({ wallets }) déverrouille plusieurs wallets", () => {
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xa", "ethereum-sepolia", "Wallet A"),
        makeArg("0xb", "bsc", "Wallet B"),
      ],
    });
    const s = useWalletStore.getState();
    expect(s.status).toBe("unlocked");
    expect(Object.keys(s.wallets).sort()).toEqual(["0xa", "0xb"]);
    // Premier wallet (0xa) actif par défaut (pas d'activeId persisté)
    expect(s.activeId).toBe("0xa");
    expect(s.networkId).toBe("ethereum-sepolia");
    expect(s.family).toBe("evm");
    // wallet raccourci
    expect(s.wallet).toBe(fakeBip39Wallet);
  });

  it("switchWallet change la référence sans destroy", () => {
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xa", "ethereum-sepolia", "Wallet A"),
        makeArg("0xb", "bsc", "Wallet B"),
      ],
    });
    useWalletStore.getState().switchWallet("0xb");
    const s = useWalletStore.getState();
    expect(s.activeId).toBe("0xb");
    expect(s.networkId).toBe("bsc");
    expect(s.family).toBe("evm");
    // Aucun destroy appelé
    expect((fakeBip39Wallet.destroy as ReturnType<typeof vi.fn>).mock.calls)
      .toHaveLength(0);
  });

  it("switchWallet persiste le réseau par wallet (walletNetworks)", () => {
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xa", "ethereum-sepolia", "Wallet A"),
        makeArg("0xb", "bsc", "Wallet B"),
      ],
    });
    // Modifie le réseau du wallet A
    useWalletStore.getState().setNetworkId("arbitrum-one");
    expect(
      useWalletStore.getState().walletNetworks["0xa"],
    ).toBe("arbitrum-one");

    // Switch vers B : son réseau reste "bsc" (pas contaminé par A)
    useWalletStore.getState().switchWallet("0xb");
    expect(useWalletStore.getState().networkId).toBe("bsc");

    // Retour vers A : retrouve "arbitrum-one"
    useWalletStore.getState().switchWallet("0xa");
    expect(useWalletStore.getState().networkId).toBe("arbitrum-one");
  });

  it("unlock restaure le dernier activeId persisté", () => {
    useWalletStore.setState({ activeId: "0xb" });
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xa", "ethereum-sepolia", "Wallet A"),
        makeArg("0xb", "bsc", "Wallet B"),
      ],
    });
    expect(useWalletStore.getState().activeId).toBe("0xb");
    expect(useWalletStore.getState().networkId).toBe("bsc");
  });

  it("unlock : activeId périmé → premier wallet déverrouillé", () => {
    useWalletStore.setState({ activeId: "0xmissing" });
    useWalletStore.getState().unlock({
      wallets: [makeArg("0xa", "ethereum-sepolia", "Wallet A")],
    });
    expect(useWalletStore.getState().activeId).toBe("0xa");
  });

  it("lock détruit tous les wallets et préserve les préférences", () => {
    const destroy = fakeBip39Wallet.destroy as ReturnType<typeof vi.fn>;
    destroy.mockClear();

    useWalletStore.getState().unlock({
      wallets: [makeArg("0xa", "ethereum-sepolia", "Wallet A")],
    });
    useWalletStore.getState().setNetworkId("bsc");

    useWalletStore.getState().lock();

    const s = useWalletStore.getState();
    expect(s.status).toBe("locked");
    expect(s.wallets).toEqual({});
    expect(s.wallet).toBeNull();
    expect(s.format).toBeNull();
    // Préférences préservées
    expect(s.activeId).toBe("0xa");
    expect(s.walletNetworks["0xa"]).toBe("bsc");
    // destroy appelé sur l'instance
    expect(destroy).toHaveBeenCalled();
  });

  it("forgetWallet supprime entrée + préférences, garde le store indépendant", () => {
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xa", "ethereum-sepolia", "Wallet A"),
        makeArg("0xb", "bsc", "Wallet B"),
      ],
    });

    useWalletStore.getState().forgetWallet("0xb");

    const s = useWalletStore.getState();
    expect(s.wallets["0xb"]).toBeUndefined();
    expect(s.wallets["0xa"]).toBeDefined();
    expect(s.walletNetworks["0xb"]).toBeUndefined();
    expect(s.walletAccounts["0xb"]).toBeUndefined();
  });

  it("forgetWallet sur activeId bascule vers un autre", () => {
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xa", "ethereum-sepolia", "Wallet A"),
        makeArg("0xb", "bsc", "Wallet B"),
      ],
    });
    expect(useWalletStore.getState().activeId).toBe("0xa");

    useWalletStore.getState().forgetWallet("0xa");

    const s = useWalletStore.getState();
    expect(s.activeId).toBe("0xb");
    expect(s.status).toBe("unlocked");
  });

  it("forgetWallet du dernier wallet → status locked", () => {
    useWalletStore.getState().unlock({
      wallets: [makeArg("0xa", "ethereum-sepolia", "Wallet A")],
    });
    useWalletStore.getState().forgetWallet("0xa");

    const s = useWalletStore.getState();
    expect(s.wallets).toEqual({});
    expect(s.wallet).toBeNull();
    expect(s.status).toBe("locked");
    expect(s.activeId).toBeNull();
  });

  it("ancienne forme unlock() reste supportée (compat)", () => {
    useWalletStore.getState().unlock({
      wallet: fakeBip39Wallet,
      id: "0xlegacy",
      format: "bip39",
      networkId: "ethereum-sepolia",
    });
    const s = useWalletStore.getState();
    expect(s.status).toBe("unlocked");
    expect(s.activeId).toBe("0xlegacy");
    expect(s.wallets["0xlegacy"]).toBeDefined();
    expect(s.wallets["0xlegacy"]!.label).toBe("Mon portefeuille");
  });
});

// ────────────────────────────────────────────────────────────
//  Phase 3.4 — forgetWallet (D24·B : prochain = plus ancien)
// ────────────────────────────────────────────────────────────

describe("wallet-store — Phase 3.4 (forgetWallet next active)", () => {
  function makeArg(id: string, createdAt: number) {
    return {
      id,
      wallet: fakeBip39Wallet,
      format: "bip39" as const,
      networkId: "ethereum-sepolia",
      label: id,
      createdAt,
    };
  }

  it("forget actif → plus ancien createdAt devient actif", () => {
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xa", 100), // plus ancien
        makeArg("0xb", 200),
        makeArg("0xc", 300), // plus récent
      ],
    });
    useWalletStore.getState().switchWallet("0xa");
    expect(useWalletStore.getState().activeId).toBe("0xa");

    useWalletStore.getState().forgetWallet("0xa");

    // 0xb (createdAt 200) devient actif — pas 0xc
    expect(useWalletStore.getState().activeId).toBe("0xb");
  });

  it("forget actif → indépendant de l'ordre d'insertion Object.keys", () => {
    // Insertion en désordre, activeId = le plus récent (0xc)
    useWalletStore.setState({ activeId: "0xc" });
    useWalletStore.getState().unlock({
      wallets: [
        makeArg("0xc", 300),
        makeArg("0xa", 100), // plus ancien, inséré 2e
        makeArg("0xb", 200),
      ],
    });

    useWalletStore.getState().forgetWallet("0xc");

    // 0xa (createdAt 100) — le plus ancien — devient actif
    expect(useWalletStore.getState().activeId).toBe("0xa");
  });
});
