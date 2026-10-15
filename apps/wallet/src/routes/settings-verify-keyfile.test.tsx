import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// i18n mock stable.
const { tStable } = vi.hoisted(() => ({
  tStable: {
    settings: {
      verifyKeyfile: {
        title: "Vérifier un keyfile",
        subtitle: "Sélectionne ton fichier…",
        back: "Retour",
        selectFile: "Choisir un keyfile",
        readingFile: "Lecture…",
        fileReady: "Fichier chargé",
        invalidFile: "Fichier invalide",
        fieldAddress: "Adresse",
        fieldNetwork: "Réseau",
        fieldExportedAt: "Exporté le",
        passwordLabel: "Mot de passe",
        submit: "Vérifier",
        verifying: "Vérification…",
        wrongPassword: "Mauvais mot de passe",
        derivedAddress: "Adresse dérivée",
        matchesActive: "Correspond au wallet actif.",
        differentWallet: "Correspond à un autre wallet.",
        noActiveWallet: "Aucun wallet actif.",
        changeFile: "Changer de fichier",
      },
    },
  },
}));
vi.mock("@/i18n/use-translation", () => ({
  useTranslation: () => tStable,
}));

const pickJsonFileMock = vi.fn();
vi.mock("@/lib/keyfile", () => ({
  pickJsonFile: (...args: unknown[]) => pickJsonFileMock(...args),
}));

import { useWalletStore } from "@/stores/wallet-store";

import { SettingsVerifyKeyfileRoute } from "./settings-verify-keyfile";

beforeEach(() => {
  pickJsonFileMock.mockReset();
  useWalletStore.setState({ wallet: null });
});

afterEach(cleanup);

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsVerifyKeyfileRoute />
    </MemoryRouter>,
  );
}

/** Keyfile minimal connu (généré une fois, format v1). */
const VALID_KEYFILE = {
  format: "sango-bip39-keyfile",
  version: 1,
  exportedAt: "2024-01-01T00:00:00Z",
  networkId: "ethereum-sepolia",
  addressHex: "0x" + "aa".repeat(20),
  kdf: "PBKDF2-SHA256",
  iterations: 600_000,
  salt: "00".repeat(16),
  iv: "00".repeat(12),
  ciphertext: "00".repeat(80),
};

describe("SettingsVerifyKeyfileRoute", () => {
  it("état initial : bouton de sélection", () => {
    renderPage();
    expect(screen.getByTestId("pick-keyfile-button")).toBeTruthy();
    expect(screen.queryByTestId("verify-submit")).toBeNull();
  });

  it("fichier invalide → erreur", async () => {
    pickJsonFileMock.mockRejectedValue(new Error("Format inconnu"));
    renderPage();
    fireEvent.click(screen.getByTestId("pick-keyfile-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-error")).toBeTruthy();
    });
  });

  it("annulation de sélection → pas d'erreur", async () => {
    pickJsonFileMock.mockRejectedValue(new Error("Sélection annulée"));
    renderPage();
    fireEvent.click(screen.getByTestId("pick-keyfile-button"));
    // Toujours en idle
    await waitFor(() => {
      expect(screen.queryByTestId("verify-error")).toBeNull();
    });
  });

  it("keyfile valide → formulaire password", async () => {
    pickJsonFileMock.mockResolvedValue(VALID_KEYFILE);
    renderPage();
    fireEvent.click(screen.getByTestId("pick-keyfile-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-password-input")).toBeTruthy();
    });
    expect(screen.getByTestId("verify-submit")).toBeTruthy();
  });

  it("mauvais password → erreur wrongPassword", async () => {
    pickJsonFileMock.mockResolvedValue(VALID_KEYFILE);
    renderPage();
    fireEvent.click(screen.getByTestId("pick-keyfile-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-password-input")).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId("verify-password-input"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByTestId("verify-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-error")).toBeTruthy();
    });
  });

  it("keyfile V1 legacy → message d'orientation", async () => {
    pickJsonFileMock.mockResolvedValue({
      format: "sango-wallet-keyfile",
      version: 1,
    });
    renderPage();
    fireEvent.click(screen.getByTestId("pick-keyfile-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-error")).toBeTruthy();
    });
  });

  it("reset après erreur → état initial", async () => {
    pickJsonFileMock.mockRejectedValue(new Error("Format inconnu"));
    renderPage();
    fireEvent.click(screen.getByTestId("pick-keyfile-button"));
    await waitFor(() => {
      expect(screen.getByTestId("verify-error")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("verify-retry"));
    expect(screen.getByTestId("pick-keyfile-button")).toBeTruthy();
    expect(screen.queryByTestId("verify-error")).toBeNull();
  });
});
