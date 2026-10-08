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

import { CreateUnified } from "./create-unified";

afterEach(cleanup);

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateUnified />
    </MemoryRouter>,
  );
}

describe("CreateUnified — Phase 5.3 (Trust Wallet model)", () => {
  it("rend le formulaire sans pills réseau", () => {
    renderPage();
    // Titre du flow
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /Créer un portefeuille/i,
    );
    // Aucun pill réseau
    expect(screen.queryByTestId(/^network-pill-/)).toBeNull();
    // Champs password + confirm présents
    expect(
      document.querySelector("#create-password"),
    ).not.toBeNull();
    expect(
      document.querySelector("#create-confirm"),
    ).not.toBeNull();
  });

  it("affiche l'étape 1 sur 3", () => {
    renderPage();
    expect(screen.getByText(/Étape 1 sur 3/)).toBeTruthy();
  });

  it("affiche l'acknowledgement 'no recovery'", () => {
    renderPage();
    // Le texte exact vient de t.onboarding.create.ackNoRecovery
    expect(
      screen.getByText(/Sango ne peut pas récupérer mon mot de passe/i),
    ).toBeTruthy();
  });
});
