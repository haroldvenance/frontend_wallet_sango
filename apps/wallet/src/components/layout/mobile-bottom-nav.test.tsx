import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useWalletStore } from "@/stores/wallet-store";

import { MobileBottomNav } from "./mobile-bottom-nav";

afterEach(cleanup);

beforeEach(() => {
  useWalletStore.setState({
    format: null,
    status: "no-wallet",
    family: "evm",
    networkId: "ethereum-mainnet",
  });
});

function renderNav() {
  return render(
    <MemoryRouter>
      <MobileBottomNav />
    </MemoryRouter>,
  );
}

describe("MobileBottomNav — Phase 5.7", () => {
  it("affiche 5 items (dont Explorer)", () => {
    renderNav();
    const links = screen.getAllByRole("link");
    // 4 NavLink + 1 <a> Explorer
    expect(links).toHaveLength(5);
  });

  it("affiche 'Historique' (pas 'Activité')", () => {
    renderNav();
    expect(screen.getByText("Historique")).toBeTruthy();
    expect(screen.queryByText("Activité")).toBeNull();
  });

  it("affiche 'Explorer'", () => {
    renderNav();
    expect(screen.getByText("Explorer")).toBeTruthy();
  });

  it("Explorer ouvre dans un nouvel onglet avec rel sécurisé", () => {
    renderNav();
    const explorer = screen
      .getAllByRole("link")
      .find((a) => a.textContent?.includes("Explorer")) as HTMLAnchorElement;
    expect(explorer.target).toBe("_blank");
    expect(explorer.rel).toContain("noopener");
  });

  it("SANGO : item 3 = Staking", () => {
    useWalletStore.setState({ family: "sango" });
    renderNav();
    expect(screen.getByText("Staking")).toBeTruthy();
  });

  it("non-SANGO : item 3 = Envoyer", () => {
    useWalletStore.setState({ family: "evm" });
    renderNav();
    expect(screen.getByText("Envoyer")).toBeTruthy();
  });
});
