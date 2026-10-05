import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from "sonner";

import { useWalletStore } from "@/stores/wallet-store";
import { EvmNetworkSelector } from "./evm-network-selector";

/**
 * 🔒 EvmNetworkSelector — API controlled/uncontrolled (D-E2.3-2)
 *
 * Invariant central : le simple fait que `value` soit fourni bascule
 * entièrement le composant en controlled — pas d'écriture dans
 * `wallet-store`, pas de toast, pas de garde-fou `format === "bip39"`.
 */

beforeEach(() => {
  vi.clearAllMocks();
  useWalletStore.setState({
    format: "bip39",
    status: "unlocked",
    networkId: "ethereum-sepolia",
  });
});

// ────────────────────────────────────────────────────────────
//  Mode controlled (create/import)
// ────────────────────────────────────────────────────────────

describe("EvmNetworkSelector — controlled", () => {
  it("affiche la valeur fournie comme active", () => {
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    // Le nom du réseau BSC apparaît en "Actif : ..."
    expect(screen.getByText(/BNB Smart Chain$/)).toBeDefined();
    expect(screen.getByText("BNB Smart Chain")).toBeDefined();
  });

  it("appelle onChange avec le nouveau networkId sans toucher au store", () => {
    const onChange = vi.fn();
    const before = useWalletStore.getState().networkId;
    render(<EvmNetworkSelector value="bsc" onChange={onChange} />);

    // Clique sur "Arbitrum One" (non actif)
    fireEvent.click(screen.getByRole("button", { name: /Arbitrum One/ }));

    expect(onChange).toHaveBeenCalledWith("arbitrum-one");
    expect(useWalletStore.getState().networkId).toBe(before);
  });

  it("n'émet aucun toast.success (pas de session)", () => {
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Arbitrum One/ }));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("s'affiche même si format=null (create/import sans session)", () => {
    useWalletStore.setState({ format: null, status: "no-wallet" });
    render(
      <EvmNetworkSelector value="ethereum-sepolia" onChange={() => {}} />,
    );
    // Le sélecteur est bien rendu, actif = sepolia.
    expect(screen.getByText("Ethereum Sepolia")).toBeDefined();
  });

  it("s'affiche même si format=sango-legacy (protection contre le garde-fou)", () => {
    useWalletStore.setState({ format: "sango-legacy", status: "unlocked" });
    render(
      <EvmNetworkSelector value="ethereum-sepolia" onChange={() => {}} />,
    );
    expect(screen.getByText("Ethereum Sepolia")).toBeDefined();
  });

  it("no-op si on clique sur le réseau déjà actif", () => {
    const onChange = vi.fn();
    render(<EvmNetworkSelector value="bsc" onChange={onChange} />);
    // Le bouton BSC est disabled — pas d'appel même si on force le clic.
    fireEvent.click(screen.getByRole("button", { name: /BNB Smart Chain$/ }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────
//  Mode uncontrolled (Settings)
// ────────────────────────────────────────────────────────────

describe("EvmNetworkSelector — uncontrolled", () => {
  it("affiche le networkId du store", () => {
    useWalletStore.setState({ networkId: "base" });
    render(<EvmNetworkSelector />);
    expect(screen.getByText("Base")).toBeDefined();
  });

  it("écrit dans le store au changement + toast.success", () => {
    render(<EvmNetworkSelector />);
    fireEvent.click(screen.getByRole("button", { name: /Arbitrum One/ }));
    expect(useWalletStore.getState().networkId).toBe("arbitrum-one");
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Arbitrum One"),
    );
  });

  it("ne s'affiche pas si format !== 'bip39'", () => {
    useWalletStore.setState({ format: "sango-legacy", status: "unlocked" });
    const { container } = render(<EvmNetworkSelector />);
    expect(container.firstChild).toBeNull();
  });

  it("ne s'affiche pas si format=null", () => {
    useWalletStore.setState({ format: null, status: "no-wallet" });
    const { container } = render(<EvmNetworkSelector />);
    expect(container.firstChild).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────
//  Invariant D-E2.3-2 : séparation stricte des modes
// ────────────────────────────────────────────────────────────

describe("EvmNetworkSelector — invariant de séparation", () => {
  it("controlled : le store ne sert jamais de fallback d'affichage", () => {
    // Store = base, value = bsc. On attend l'affichage de bsc (pas base).
    useWalletStore.setState({ networkId: "base" });
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    // "Actif : BNB Smart Chain", pas "Actif : Base".
    const actif = screen.getByText(/Actif :/);
    expect(actif.textContent).toMatch(/BNB Smart Chain/);
    expect(actif.textContent).not.toMatch(/Actif : Base$/);
  });
});
