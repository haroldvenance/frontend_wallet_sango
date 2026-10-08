import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Bip39Wallet } from "@sango/wallet-core";
import type { WalletSession } from "@sango/wallet-session";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";

import { WalletsAndAccountsModal } from "./wallets-and-accounts-modal";

afterEach(cleanup);

// Vraie instance (instanceof Bip39Wallet requis par useAccounts).
const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";
let fakeBip39: Bip39Wallet;

function makeSession(): WalletSession {
  return {
    getBalance: async () => ({ amount: 0n }),
  } as unknown as WalletSession;
}

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={qc}>
      <WalletSessionContext.Provider value={makeSession()}>
        {children}
      </WalletSessionContext.Provider>
    </QueryClientProvider>
  );
}

function seedTwoWallets() {
  useWalletStore.getState().unlock({
    wallets: [
      {
        id: "0xa",
        wallet: fakeBip39,
        format: "bip39",
        networkId: "ethereum-sepolia",
        label: "Mon portefeuille",
        createdAt: 100,
      },
      {
        id: "0xb",
        wallet: fakeBip39,
        format: "bip39",
        networkId: "bsc",
        label: "Mon portefeuille",
        createdAt: 200,
      },
    ],
  });
  useWalletStore.setState({ activeId: "0xa" });
}

beforeEach(async () => {
  if (!fakeBip39) {
    fakeBip39 = await Bip39Wallet.fromMnemonic(MNEMONIC);
  }
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

describe("WalletsAndAccountsModal — Phase 3.3", () => {
  it("null si open=false", () => {
    seedTwoWallets();
    const { container } = render(
      <WalletsAndAccountsModal open={false} onClose={() => {}} />,
      { wrapper: Wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it("affiche un WalletRow par wallet, triés par position", () => {
    seedTwoWallets();
    render(
      <WalletsAndAccountsModal open={true} onClose={() => {}} />,
      { wrapper: Wrapper },
    );
    const rows = screen.getAllByTestId(/^wallet-row-/);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("Portefeuille 1");
    expect(rows[1]!.textContent).toContain("Portefeuille 2");
  });

  it("wallet actif est déplié par défaut (D18·A)", () => {
    seedTwoWallets();
    render(
      <WalletsAndAccountsModal open={true} onClose={() => {}} />,
      { wrapper: Wrapper },
    );
    // Le wallet actif 0xa est déplié → voir AccountRow index 0
    expect(screen.getByTestId("account-row-0")).toBeTruthy();
    // Wallet 0xb replié → pas de row compte pour lui (même index 0 mais
    // data-testid identique → un seul existe).
    const accountRows = screen.getAllByTestId(/^account-row-/);
    expect(accountRows).toHaveLength(1);
  });

  it("clic sur wallet replié → switchWallet + expand (D10·A)", () => {
    seedTwoWallets();
    render(
      <WalletsAndAccountsModal open={true} onClose={() => {}} />,
      { wrapper: Wrapper },
    );
    // Actif = 0xa, clic sur 0xb
    fireEvent.click(screen.getByTestId("wallet-row-0xb"));
    // switchWallet a muté activeId
    expect(useWalletStore.getState().activeId).toBe("0xb");
    // expand : le bouton "+ Ajouter un compte" est visible sous 0xb
    expect(screen.getByTestId("wallet-add-account-0xb")).toBeTruthy();
  });

  it("pas de bouton ⋯ (D16·C)", () => {
    seedTwoWallets();
    render(
      <WalletsAndAccountsModal open={true} onClose={() => {}} />,
      { wrapper: Wrapper },
    );
    // Aucun bouton ⋯ / aria-label "Menu" / etc.
    const buttons = document.querySelectorAll("button");
    const hasEllipsis = Array.from(buttons).some((b) =>
      b.textContent?.includes("⋯"),
    );
    expect(hasEllipsis).toBe(false);
  });

  it("pas de footer Créer/Importer (D17·C)", () => {
    seedTwoWallets();
    render(
      <WalletsAndAccountsModal open={true} onClose={() => {}} />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByText(/Créer un portefeuille/i)).toBeNull();
    expect(screen.queryByText(/Importer un portefeuille/i)).toBeNull();
  });

  it("bouton Ajouter un compte présent sous le wallet déplié", () => {
    seedTwoWallets();
    render(
      <WalletsAndAccountsModal open={true} onClose={() => {}} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId("wallet-add-account-0xa")).toBeTruthy();
  });

  it("X appelle onClose", () => {
    seedTwoWallets();
    let closed = false;
    render(
      <WalletsAndAccountsModal
        open={true}
        onClose={() => {
          closed = true;
        }}
      />,
      { wrapper: Wrapper },
    );
    // Le bouton X a aria-label="Fermer"
    fireEvent.click(screen.getByLabelText("Fermer"));
    expect(closed).toBe(true);
  });
});
