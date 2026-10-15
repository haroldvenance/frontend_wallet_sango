import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sango/wallet-core", () => ({
  changeKeyringPassword: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

import { changeKeyringPassword } from "@sango/wallet-core";

import { useWalletStore } from "@/stores/wallet-store";

import { SettingsChangePasswordRoute } from "./settings-change-password";

const mockChange = vi.mocked(changeKeyringPassword);

afterEach(cleanup);

beforeEach(() => {
  mockChange.mockReset();
  mockNavigate.mockReset();
  useWalletStore.setState({
    wallets: {
      "0xabc": {
        wallet: {} as never,
        format: "bip39",
        networkId: "ethereum-sepolia",
        label: "Test Wallet",
        createdAt: 1,
      },
    },
    wallet: null,
    activeId: "0xabc",
    walletAccounts: { "0xabc": { highestIndex: 0, activeIndex: 0 } },
    walletNetworks: { "0xabc": "ethereum-sepolia" },
    format: "bip39",
    status: "unlocked",
    networkId: "ethereum-sepolia",
    family: "evm",
    network: "testnet",
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsChangePasswordRoute />
    </MemoryRouter>,
  );
}

function fillForm(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByTestId("cp-current"), {
    target: { value: current },
  });
  fireEvent.change(screen.getByTestId("cp-new"), { target: { value: next } });
  fireEvent.change(screen.getByTestId("cp-confirm"), {
    target: { value: confirm },
  });
}

describe("SettingsChangePasswordRoute — Phase 11.2", () => {
  it("bloque si le nouveau mot de passe est trop court", async () => {
    renderPage();
    fillForm("old-password-1", "short", "short");
    fireEvent.click(screen.getByTestId("cp-submit"));
    expect(await screen.findByTestId("cp-error")).toBeTruthy();
    expect(mockChange).not.toHaveBeenCalled();
  });

  it("bloque si les deux nouveaux mots de passe diffèrent", async () => {
    renderPage();
    fillForm("old-password-1", "new-password-2", "different-password");
    fireEvent.click(screen.getByTestId("cp-submit"));
    expect(await screen.findByTestId("cp-error")).toBeTruthy();
    expect(mockChange).not.toHaveBeenCalled();
  });

  it("bloque si le nouveau mot de passe est identique à l'actuel", async () => {
    renderPage();
    fillForm("same-password-1", "same-password-1", "same-password-1");
    fireEvent.click(screen.getByTestId("cp-submit"));
    expect(await screen.findByTestId("cp-error")).toBeTruthy();
    expect(mockChange).not.toHaveBeenCalled();
  });

  it("affiche un succès sur status=ok", async () => {
    mockChange.mockResolvedValue({ status: "ok" });
    renderPage();
    fillForm("old-password-1", "new-password-2", "new-password-2");
    fireEvent.click(screen.getByTestId("cp-submit"));
    expect(await screen.findByTestId("cp-success-title")).toBeTruthy();
    expect(screen.queryByTestId("cp-warning")).toBeNull();
  });

  it("affiche un avertissement sur status=warning", async () => {
    mockChange.mockResolvedValue({
      status: "warning",
      message: "post-commit verification failed",
    });
    renderPage();
    fillForm("old-password-1", "new-password-2", "new-password-2");
    fireEvent.click(screen.getByTestId("cp-submit"));
    expect(await screen.findByTestId("cp-success-title")).toBeTruthy();
    expect(screen.getByTestId("cp-warning")).toBeTruthy();
  });

  it("affiche une erreur sur mauvais mot de passe actuel", async () => {
    mockChange.mockResolvedValue({
      status: "error",
      reason: "wrong-current-password",
    });
    renderPage();
    fillForm("WRONG", "new-password-2", "new-password-2");
    fireEvent.click(screen.getByTestId("cp-submit"));
    expect(await screen.findByTestId("cp-error")).toBeTruthy();
  });

  it("verrouille et navigue vers /unlock sur 'Compris'", async () => {
    mockChange.mockResolvedValue({ status: "ok" });
    const lockSpy = vi.fn();
    useWalletStore.setState({ lock: lockSpy });

    renderPage();
    fillForm("old-password-1", "new-password-2", "new-password-2");
    fireEvent.click(screen.getByTestId("cp-submit"));
    await screen.findByTestId("cp-success-title");

    fireEvent.click(screen.getByTestId("cp-acknowledge"));
    expect(lockSpy).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/unlock", { replace: true });
  });
});
