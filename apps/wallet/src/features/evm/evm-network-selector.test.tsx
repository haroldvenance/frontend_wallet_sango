import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
 * ⚠️ La cleanup automatique de @testing-library/react n'est pas
 *    active dans ce projet (globals Vitest désactivés). On appelle
 *    `cleanup()` explicitement après chaque test pour éviter
 *    l'accumulation dans le DOM (sinon `getByTestId` échoue avec
 *    "Found multiple elements").
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useWalletStore.setState({
    format: "bip39",
    status: "unlocked",
    networkId: "ethereum-sepolia",
    family: "evm",
  });
});

// Helpers
function option(id: string) {
  return screen.getByTestId(`network-option-${id}`);
}
function activeName(): string {
  return screen.getByTestId("network-active-name").textContent ?? "";
}

// ────────────────────────────────────────────────────────────
//  Mode controlled (create/import)
// ────────────────────────────────────────────────────────────

describe("EvmNetworkSelector — controlled", () => {
  it("affiche la valeur fournie comme active", () => {
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    expect(activeName()).toBe("BNB Smart Chain");
  });

  it("appelle onChange avec le nouveau networkId sans toucher au store", () => {
    const onChange = vi.fn();
    const before = useWalletStore.getState().networkId;
    render(<EvmNetworkSelector value="bsc" onChange={onChange} />);

    fireEvent.click(option("arbitrum-one"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("arbitrum-one");
    expect(useWalletStore.getState().networkId).toBe(before);
  });

  it("n'émet aucun toast.success (pas de session)", () => {
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    fireEvent.click(option("arbitrum-one"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("s'affiche même si format=null (create/import sans session)", () => {
    useWalletStore.setState({ format: null, status: "no-wallet" });
    render(
      <EvmNetworkSelector value="ethereum-sepolia" onChange={() => {}} />,
    );
    expect(activeName()).toBe("Ethereum Sepolia");
  });

  it("s'affiche même si format=sango-legacy (protection contre le garde-fou)", () => {
    useWalletStore.setState({ format: "sango-legacy", status: "unlocked" });
    render(
      <EvmNetworkSelector value="ethereum-sepolia" onChange={() => {}} />,
    );
    expect(activeName()).toBe("Ethereum Sepolia");
  });

  it("no-op si on clique sur le réseau déjà actif (bouton disabled)", () => {
    const onChange = vi.fn();
    render(<EvmNetworkSelector value="bsc" onChange={onChange} />);
    fireEvent.click(option("bsc"));
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
    expect(activeName()).toBe("Base");
  });

  it("écrit dans le store au changement + toast.success", () => {
    render(<EvmNetworkSelector />);
    fireEvent.click(option("arbitrum-one"));
    expect(useWalletStore.getState().networkId).toBe("arbitrum-one");
    expect(toast.success).toHaveBeenCalledTimes(1);
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
    useWalletStore.setState({ networkId: "base" });
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    expect(activeName()).toBe("BNB Smart Chain");
    expect(activeName()).not.toBe("Base");
  });

  it("controlled : value ne touche pas au store même après plusieurs clics", () => {
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    fireEvent.click(option("arbitrum-one"));
    fireEvent.click(option("base"));
    fireEvent.click(option("ethereum-mainnet"));
    expect(useWalletStore.getState().networkId).toBe("ethereum-sepolia");
  });
});

// ────────────────────────────────────────────────────────────
//  E2.3.a.3 — Bandeau mainnet (D-E2.3-3)
// ────────────────────────────────────────────────────────────

describe("EvmNetworkSelector — MainnetWarning (D-E2.3-3)", () => {
  it("controlled + mainnet → warning rendu", () => {
    render(<EvmNetworkSelector value="bsc" onChange={() => {}} />);
    expect(screen.getByTestId("mainnet-warning")).toBeDefined();
  });

  it("controlled + testnet → warning null", () => {
    render(
      <EvmNetworkSelector value="ethereum-sepolia" onChange={() => {}} />,
    );
    expect(screen.queryByTestId("mainnet-warning")).toBeNull();
  });

  it("uncontrolled + mainnet → warning rendu (cohérence modes)", () => {
    useWalletStore.setState({ networkId: "ethereum-mainnet" });
    render(<EvmNetworkSelector />);
    expect(screen.getByTestId("mainnet-warning")).toBeDefined();
  });

  it("uncontrolled + testnet → warning null", () => {
    useWalletStore.setState({ networkId: "bsc-testnet" });
    render(<EvmNetworkSelector />);
    expect(screen.queryByTestId("mainnet-warning")).toBeNull();
  });
});
