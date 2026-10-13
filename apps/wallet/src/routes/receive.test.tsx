import { Bip39Wallet } from "@sango/wallet-core";
import type { Wallet } from "@sango/wallet-core";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { useWalletStore } from "@/stores/wallet-store";

import { ReceiveRoute } from "./receive";

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";

afterEach(cleanup);

beforeEach(() => {
  useWalletStore.setState({
    wallets: {},
    wallet: null,
    activeId: null,
    walletAccounts: {},
    walletNetworks: {},
    format: null,
    networkId: "ethereum-mainnet",
    family: "evm",
    network: "testnet",
    status: "no-wallet",
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ReceiveRoute />
    </MemoryRouter>,
  );
}

describe("ReceiveRoute — Phase 7", () => {
  it("Bip39Wallet : affiche les 3 sections EVM / Bitcoin / Sango", async () => {
    const bip39 = await Bip39Wallet.fromMnemonic(MNEMONIC);
    useWalletStore.setState({
      wallet: bip39,
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
    });
    renderPage();
    expect(screen.getByTestId("receive-card-evm")).toBeTruthy();
    expect(screen.getByTestId("receive-card-bitcoin")).toBeTruthy();
    expect(screen.getByTestId("receive-card-sango")).toBeTruthy();
  });

  it("Wallet V1 (sango-legacy) : uniquement SANGO", () => {
    // Fake cast : `Wallet.fromSeed` nécessite WebCrypto SHA-512
    // (ed25519.getPublicKeyAsync) qui n'est pas fourni par jsdom. On
    // teste la **discrimination** `format === "sango-legacy"`, pas la
    // crypto — même pattern que `wallet-row.test.tsx`.
    const fakeLegacy = {
      destroy: () => {},
      identity: {
        addressBech32: "tsango1fake",
        addressHex: "0xfake",
      },
    } as unknown as Wallet;

    useWalletStore.setState({
      wallet: fakeLegacy,
      format: "sango-legacy",
      status: "unlocked",
      activeId: "0xlegacy",
    });
    renderPage();
    expect(screen.queryByTestId("receive-card-evm")).toBeNull();
    expect(screen.queryByTestId("receive-card-bitcoin")).toBeNull();
    expect(screen.getByTestId("receive-card-sango")).toBeTruthy();
  });

  it("pas de wallet : affiche un état vide", () => {
    renderPage();
    expect(screen.queryByTestId("receive-card-evm")).toBeNull();
    expect(screen.queryByTestId("receive-card-sango")).toBeNull();
  });

  it("les cards contiennent des canvas QR", async () => {
    const bip39 = await Bip39Wallet.fromMnemonic(MNEMONIC);
    useWalletStore.setState({
      wallet: bip39,
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
    });
    const { container } = renderPage();
    const canvases = container.querySelectorAll("canvas");
    expect(canvases.length).toBe(3);
  });

  it("chaque card expose copier / partager / télécharger", async () => {
    const bip39 = await Bip39Wallet.fromMnemonic(MNEMONIC);
    useWalletStore.setState({
      wallet: bip39,
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
    });
    renderPage();
    expect(screen.getByTestId("receive-card-evm-copy")).toBeTruthy();
    expect(screen.getByTestId("receive-card-evm-share")).toBeTruthy();
    expect(screen.getByTestId("receive-card-evm-download")).toBeTruthy();
  });

  it("adresse EVM = vecteur MetaMask pour 'abandon…about'", async () => {
    const bip39 = await Bip39Wallet.fromMnemonic(MNEMONIC);
    useWalletStore.setState({
      wallet: bip39,
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
    });
    renderPage();
    const content = document.body.textContent ?? "";
    expect(content).toMatch(/0x9858EfFD/i);
  });
});
