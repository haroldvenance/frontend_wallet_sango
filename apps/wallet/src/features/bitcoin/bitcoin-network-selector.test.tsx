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
import { BitcoinNetworkSelector } from "./bitcoin-network-selector";

/**
 * 🔒 BitcoinNetworkSelector — E2.1.b.7.b
 *
 * Invariant : `value !== undefined` bascule en controlled (pas de
 * store, pas de toast). Même API qu'`EvmNetworkSelector`.
 *
 * ⚠️ cleanup explicite (pas de cleanup auto dans ce projet).
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useWalletStore.setState({
    format: "bip39",
    status: "unlocked",
    networkId: "bitcoin-testnet",
    family: "bitcoin",
    network: "testnet",
  });
});

function option(id: string) {
  return screen.getByTestId(`bitcoin-network-option-${id}`);
}
function activeName(): string {
  return (
    screen.getByTestId("bitcoin-network-active-name").textContent ?? ""
  );
}

describe("BitcoinNetworkSelector — uncontrolled", () => {
  it("affiche le networkId du store", () => {
    render(<BitcoinNetworkSelector />);
    expect(activeName()).toBe("Bitcoin Testnet");
  });

  it("écrit dans le store au changement + toast.success", () => {
    render(<BitcoinNetworkSelector />);
    fireEvent.click(option("bitcoin-mainnet"));
    expect(useWalletStore.getState().networkId).toBe("bitcoin-mainnet");
    expect(useWalletStore.getState().family).toBe("bitcoin");
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Bitcoin"),
    );
  });

  it("ne s'affiche pas si family ≠ bitcoin", () => {
    useWalletStore.setState({
      networkId: "ethereum-sepolia",
      family: "evm",
    });
    const { container } = render(<BitcoinNetworkSelector />);
    expect(container.firstChild).toBeNull();
  });
});

describe("BitcoinNetworkSelector — controlled", () => {
  it("affiche la valeur fournie comme active", () => {
    render(
      <BitcoinNetworkSelector value="bitcoin-mainnet" onChange={() => {}} />,
    );
    expect(activeName()).toBe("Bitcoin");
  });

  it("appelle onChange sans toucher au store, sans toast", () => {
    const onChange = vi.fn();
    const before = useWalletStore.getState().networkId;
    render(
      <BitcoinNetworkSelector value="bitcoin-testnet" onChange={onChange} />,
    );
    fireEvent.click(option("bitcoin-mainnet"));
    expect(onChange).toHaveBeenCalledWith("bitcoin-mainnet");
    expect(useWalletStore.getState().networkId).toBe(before);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("s'affiche même si family ≠ bitcoin (mode contrôlé par le parent)", () => {
    useWalletStore.setState({ family: "evm", networkId: "ethereum-sepolia" });
    render(
      <BitcoinNetworkSelector value="bitcoin-testnet" onChange={() => {}} />,
    );
    expect(activeName()).toBe("Bitcoin Testnet");
  });

  it("no-op si clic sur l'option active", () => {
    const onChange = vi.fn();
    render(
      <BitcoinNetworkSelector value="bitcoin-testnet" onChange={onChange} />,
    );
    fireEvent.click(option("bitcoin-testnet"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
