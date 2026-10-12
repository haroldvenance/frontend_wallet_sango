import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWalletStore } from "@/stores/wallet-store";

import { FamilySelector } from "./family-selector";

afterEach(cleanup);

beforeEach(() => {
  useWalletStore.setState({
    wallets: {},
    wallet: null,
    activeId: null,
    walletAccounts: {},
    walletNetworks: {},
    format: null,
    networkId: "sango-devnet",
    family: "sango",
    network: "testnet",
    status: "no-wallet",
  });
  localStorage.clear();
});

describe("FamilySelector — Phase 5.4", () => {
  it("affiche les 3 pills SANGO / EVM / Bitcoin", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-mainnet",
      family: "evm",
    });
    render(<FamilySelector />);

    expect(screen.getByTestId("family-pill-sango")).toBeTruthy();
    expect(screen.getByTestId("family-pill-evm")).toBeTruthy();
    expect(screen.getByTestId("family-pill-bitcoin")).toBeTruthy();
  });

  it("V2 : clic EVM → setNetworkId('ethereum-mainnet')", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "sango-devnet",
      family: "sango",
      walletNetworks: { "0xabc": "sango-devnet" },
    });
    render(<FamilySelector />);

    fireEvent.click(screen.getByTestId("family-pill-evm"));

    expect(useWalletStore.getState().networkId).toBe("ethereum-mainnet");
    expect(useWalletStore.getState().family).toBe("evm");
  });

  it("V2 : clic Bitcoin → setNetworkId('bitcoin-mainnet')", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "ethereum-mainnet",
      family: "evm",
      walletNetworks: { "0xabc": "ethereum-mainnet" },
    });
    render(<FamilySelector />);

    fireEvent.click(screen.getByTestId("family-pill-bitcoin"));

    expect(useWalletStore.getState().networkId).toBe("bitcoin-mainnet");
    expect(useWalletStore.getState().family).toBe("bitcoin");
  });

  it("V2 : clic SANGO → setNetworkId('sango-devnet')", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "ethereum-mainnet",
      family: "evm",
      walletNetworks: { "0xabc": "ethereum-mainnet" },
    });
    render(<FamilySelector />);

    fireEvent.click(screen.getByTestId("family-pill-sango"));

    expect(useWalletStore.getState().networkId).toBe("sango-devnet");
    expect(useWalletStore.getState().family).toBe("sango");
  });

  it("V1 : EVM et Bitcoin sont désactivés", () => {
    useWalletStore.setState({
      format: "sango-legacy",
      status: "unlocked",
      activeId: "0xsango",
      networkId: "sango-devnet",
      family: "sango",
    });
    render(<FamilySelector />);

    const evmPill = screen.getByTestId("family-pill-evm") as HTMLButtonElement;
    const btcPill = screen.getByTestId(
      "family-pill-bitcoin",
    ) as HTMLButtonElement;
    expect(evmPill.disabled).toBe(true);
    expect(btcPill.disabled).toBe(true);
  });

  it("V1 : clic EVM → refusé (store inchangé)", () => {
    useWalletStore.setState({
      format: "sango-legacy",
      status: "unlocked",
      activeId: "0xsango",
      networkId: "sango-devnet",
      family: "sango",
    });
    render(<FamilySelector />);

    // Le bouton disabled empêche le clic par défaut, mais on teste
    // aussi que si on force, le store n'est pas muté.
    const evmPill = screen.getByTestId("family-pill-evm");
    fireEvent.click(evmPill);

    expect(useWalletStore.getState().networkId).toBe("sango-devnet");
    expect(useWalletStore.getState().family).toBe("sango");
  });

  it("clic sur la famille active est un no-op", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "ethereum-mainnet",
      family: "evm",
    });
    const spy = vi.spyOn(useWalletStore.getState(), "setNetworkId");
    render(<FamilySelector />);

    fireEvent.click(screen.getByTestId("family-pill-evm"));

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
