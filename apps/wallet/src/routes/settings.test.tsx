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

import { SettingsRoute } from "./settings";

afterEach(cleanup);

beforeEach(() => {
  useWalletStore.setState({
    format: "bip39",
    status: "unlocked",
    family: "evm",
    networkId: "ethereum-mainnet",
    activeId: "0xabc",
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsRoute />
    </MemoryRouter>,
  );
}

describe("SettingsRoute — Phase 5.7", () => {
  it("affiche la section Réseau en premier avec FamilySelector", () => {
    renderPage();
    // Les 3 pills du FamilySelector
    expect(screen.getByTestId("family-pill-sango")).toBeTruthy();
    expect(screen.getByTestId("family-pill-evm")).toBeTruthy();
    expect(screen.getByTestId("family-pill-bitcoin")).toBeTruthy();
  });

  it("EVM : affiche le sélecteur EVM", () => {
    renderPage();
    // Le sous-sélecteur EVM contient "Réseau EVM"
    expect(screen.getByText(/Réseau EVM/i)).toBeTruthy();
  });

  it("Bitcoin : affiche le sélecteur Bitcoin", () => {
    useWalletStore.setState({
      family: "bitcoin",
      networkId: "bitcoin-mainnet",
    });
    renderPage();
    expect(screen.getByText(/Réseau Bitcoin/i)).toBeTruthy();
  });

  it("SANGO : affiche le sélecteur SANGO", () => {
    useWalletStore.setState({
      format: "sango-legacy",
      family: "sango",
      networkId: "sango-devnet",
    });
    renderPage();
    // Le NetworkSelector SANGO a un label "Réseau"
    expect(screen.getAllByText(/Réseau/i).length).toBeGreaterThan(0);
  });

  it("ne contient plus la ligne 'Réseau par défaut' brute", () => {
    renderPage();
    expect(screen.queryByText(/Réseau par défaut/i)).toBeNull();
  });

  it("conserve le lien Approbations", () => {
    renderPage();
    expect(screen.getByText(/Approbations/i)).toBeTruthy();
  });
});
