import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { ImportUnified } from "./import";

afterEach(cleanup);

function renderPage() {
  return render(
    <MemoryRouter>
      <ImportUnified />
    </MemoryRouter>,
  );
}

describe("ImportUnified — Phase 5.3 (BIP-39 direct)", () => {
  it("rend un textarea mnemonic + password", () => {
    renderPage();
    expect(
      screen.getByPlaceholderText(/word1 word2 word3/i),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText(/Mot de passe \(min 8/i),
    ).toBeTruthy();
  });

  it("contient un lien vers /import-sango pour le legacy", () => {
    renderPage();
    const link = screen.getByText(/page legacy/i) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/import-sango");
  });

  it("le bouton submit est désactivé quand la mnemonic est vide", () => {
    renderPage();
    const submit = screen.getByRole("button", { name: /^Importer$/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });
});
