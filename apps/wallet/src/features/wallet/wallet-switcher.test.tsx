import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Bip39Wallet } from "@sango/wallet-core";
import type { WalletSession } from "@sango/wallet-session";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";

import { WalletSwitcher } from "./wallet-switcher";

// @testing-library/react cleanup non activée globalement.
afterEach(cleanup);

// Vraie instance (instanceof Bip39Wallet requis par useAccounts pour
// que la card affiche l'adresse du compte actif).
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

describe("WalletSwitcher — Phase 3.3", () => {
  it("null si pas d'activeWallet (locked)", () => {
    const { container } = render(<WalletSwitcher />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("affiche la card avec label positionnel + badge Principal", () => {
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
      ],
    });
    render(<WalletSwitcher />, { wrapper: Wrapper });
    const card = screen.getByTestId("wallet-switcher-card");
    expect(card.textContent).toContain("Portefeuille 1");
    expect(card.textContent).toContain("Principal");
    // D11·C : label keyring "Mon portefeuille" PAS affiché.
    expect(card.textContent).not.toContain("Mon portefeuille");
  });

  it("affiche le nombre de comptes", () => {
    useWalletStore.getState().unlock({
      wallets: [
        {
          id: "0xa",
          wallet: fakeBip39,
          format: "bip39",
          networkId: "ethereum-sepolia",
          label: "A",
          createdAt: 100,
        },
      ],
    });
    useWalletStore.setState({
      walletAccounts: { "0xa": { highestIndex: 1, activeIndex: 0 } },
    });
    render(<WalletSwitcher />, { wrapper: Wrapper });
    expect(screen.getByTestId("wallet-switcher-card").textContent).toContain(
      "2 comptes",
    );
  });

  it("clic ouvre la modal", () => {
    useWalletStore.getState().unlock({
      wallets: [
        {
          id: "0xa",
          wallet: fakeBip39,
          format: "bip39",
          networkId: "ethereum-sepolia",
          label: "A",
          createdAt: 100,
        },
      ],
    });
    render(<WalletSwitcher />, { wrapper: Wrapper });
    expect(screen.queryByTestId("wallets-and-accounts-modal")).toBeNull();
    fireEvent.click(screen.getByTestId("wallet-switcher-card"));
    expect(screen.getByTestId("wallets-and-accounts-modal")).toBeTruthy();
  });
});
