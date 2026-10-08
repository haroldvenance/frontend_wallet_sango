import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Bip39Wallet, Wallet, WalletFormat } from "@sango/wallet-core";

import { useWalletStore } from "@/stores/wallet-store";

import { useWallets } from "./use-wallets";

// @testing-library/react cleanup non activée globalement (cf. handoff).
afterEach(cleanup);

const fakeBip39 = { destroy: () => {} } as unknown as Bip39Wallet;
const fakeSango = { destroy: () => {} } as unknown as Wallet;

function arg(
  id: string,
  networkId: string,
  label: string,
  createdAt: number,
  format: WalletFormat = "bip39",
) {
  return {
    id,
    wallet: format === "sango-legacy" ? fakeSango : fakeBip39,
    format,
    networkId,
    label,
    createdAt,
  };
}

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

describe("useWallets — Phase 3.2", () => {
  it("liste vide quand la session est verrouillée (status=no-wallet)", () => {
    const { result } = renderHook(() => useWallets());
    expect(result.current.wallets).toEqual([]);
    expect(result.current.activeWalletId).toBeNull();
    expect(result.current.activeWallet).toBeNull();
  });

  it("liste vide après lock() (runtime détruit)", () => {
    useWalletStore.getState().unlock({
      wallets: [arg("0xa", "ethereum-sepolia", "A", 100)],
    });
    const { result, rerender } = renderHook(() => useWallets());
    expect(result.current.wallets).toHaveLength(1);

    useWalletStore.getState().lock();
    rerender();

    expect(result.current.wallets).toEqual([]);
    expect(result.current.activeWallet).toBeNull();
    // activeId persisté reste posé, mais activeWallet est null
    // car le wallet n'est plus déverrouillé.
    expect(result.current.activeWalletId).toBe("0xa");
  });

  it("expose les wallets triés par createdAt", () => {
    useWalletStore.setState({ activeId: "0xa" });
    useWalletStore.getState().unlock({
      wallets: [
        arg("0xb", "bsc", "B", 200),
        arg("0xa", "ethereum-sepolia", "A", 100),
        arg("0xc", "base", "C", 300),
      ],
    });
    const { result } = renderHook(() => useWallets());
    expect(result.current.wallets.map((w) => w.id)).toEqual([
      "0xa",
      "0xb",
      "0xc",
    ]);
    expect(result.current.wallets.map((w) => w.label)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("isActive reflète activeId (un seul actif)", () => {
    useWalletStore.setState({ activeId: "0xb" });
    useWalletStore.getState().unlock({
      wallets: [
        arg("0xa", "ethereum-sepolia", "A", 100),
        arg("0xb", "bsc", "B", 200),
      ],
    });
    const { result } = renderHook(() => useWallets());
    expect(result.current.activeWalletId).toBe("0xb");
    expect(result.current.activeWallet?.id).toBe("0xb");
    const actives = result.current.wallets.filter((w) => w.isActive);
    expect(actives).toHaveLength(1);
    expect(actives[0]!.id).toBe("0xb");
  });

  it("reflète switchWallet()", () => {
    useWalletStore.setState({ activeId: "0xa" });
    useWalletStore.getState().unlock({
      wallets: [
        arg("0xa", "ethereum-sepolia", "A", 100),
        arg("0xb", "bsc", "B", 200),
      ],
    });
    const { result, rerender } = renderHook(() => useWallets());
    expect(result.current.activeWallet?.id).toBe("0xa");

    useWalletStore.getState().switchWallet("0xb");
    rerender();

    expect(result.current.activeWallet?.id).toBe("0xb");
    expect(result.current.wallets.find((w) => w.id === "0xa")!.isActive).toBe(
      false,
    );
    expect(result.current.wallets.find((w) => w.id === "0xb")!.isActive).toBe(
      true,
    );
  });

  it("activeWallet=null si activeId périmé (pas dans wallets)", () => {
    useWalletStore.getState().unlock({
      wallets: [arg("0xa", "ethereum-sepolia", "A", 100)],
    });
    useWalletStore.setState({ activeId: "0xmissing" });
    const { result } = renderHook(() => useWallets());
    expect(result.current.activeWalletId).toBe("0xmissing");
    expect(result.current.activeWallet).toBeNull();
    expect(result.current.wallets[0]!.isActive).toBe(false);
  });

  it("derive family depuis le networkId effectif", () => {
    useWalletStore.getState().unlock({
      wallets: [
        arg("0xe", "ethereum-sepolia", "EVM", 100),
        arg("0xb", "bitcoin-testnet", "BTC", 200),
        arg("0xs", "sango-devnet", "SANGO", 300, "sango-legacy"),
      ],
    });
    const { result } = renderHook(() => useWallets());
    const byId = Object.fromEntries(
      result.current.wallets.map((w) => [w.id, w]),
    );
    expect(byId["0xe"]!.family).toBe("evm");
    expect(byId["0xb"]!.family).toBe("bitcoin");
    expect(byId["0xs"]!.family).toBe("sango");
  });

  it("utilise walletNetworks[id] comme préférence réseau", () => {
    useWalletStore.getState().unlock({
      wallets: [arg("0xa", "ethereum-sepolia", "A", 100)],
    });
    useWalletStore.setState({ walletNetworks: { "0xa": "bsc" } });
    const { result } = renderHook(() => useWallets());
    expect(result.current.wallets[0]!.networkId).toBe("bsc");
    expect(result.current.wallets[0]!.family).toBe("evm");
  });

  it("fallback sur entry.networkId si walletNetworks[id] absent", () => {
    useWalletStore.getState().unlock({
      wallets: [arg("0xa", "ethereum-sepolia", "A", 100)],
    });
    useWalletStore.setState({ walletNetworks: {} });
    const { result } = renderHook(() => useWallets());
    expect(result.current.wallets[0]!.networkId).toBe("ethereum-sepolia");
    expect(result.current.wallets[0]!.family).toBe("evm");
  });

  it("expose format (UI 'Phrase de 12 mots' vs 'seed')", () => {
    useWalletStore.getState().unlock({
      wallets: [
        arg("0xa", "ethereum-sepolia", "A", 100),
        arg("0xs", "sango-devnet", "S", 200, "sango-legacy"),
      ],
    });
    const { result } = renderHook(() => useWallets());
    const formats = result.current.wallets.map((w) => w.format);
    expect(formats).toContain("bip39");
    expect(formats).toContain("sango-legacy");
  });

  it("forgetWallet() retire l'entrée de la liste", () => {
    useWalletStore.setState({ activeId: "0xa" });
    useWalletStore.getState().unlock({
      wallets: [
        arg("0xa", "ethereum-sepolia", "A", 100),
        arg("0xb", "bsc", "B", 200),
      ],
    });
    const { result, rerender } = renderHook(() => useWallets());
    expect(result.current.wallets).toHaveLength(2);

    useWalletStore.getState().forgetWallet("0xb");
    rerender();

    expect(result.current.wallets).toHaveLength(1);
    expect(result.current.wallets[0]!.id).toBe("0xa");
    expect(result.current.activeWallet?.id).toBe("0xa");
  });
});
