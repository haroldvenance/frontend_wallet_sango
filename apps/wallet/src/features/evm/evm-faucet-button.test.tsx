import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useWalletStore } from "@/stores/wallet-store";
import { EvmFaucetButton } from "./evm-faucet-button";

/**
 * 🔒 EvmFaucetButton — E1.7.d.2
 *
 * Vérifie :
 *   - les URL par testnet EVM connu
 *   - le rendu nul sur mainnet
 *   - le rendu nul sur réseau inconnu
 *   - target="_blank" + rel="noreferrer noopener"
 */

beforeEach(() => {
  useWalletStore.setState({
    format: "bip39",
    status: "unlocked",
    networkId: "ethereum-sepolia",
  });
});

describe("EvmFaucetButton — testnets EVM", () => {
  it("Sepolia → lien Alchemy Faucet", () => {
    useWalletStore.setState({ networkId: "ethereum-sepolia" });
    const { container } = render(<EvmFaucetButton />);
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe("https://sepoliafaucet.com/");
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noreferrer");
    expect(link.rel).toContain("noopener");
  });

  it("BSC Testnet → lien Faucet officiel BNB Chain", () => {
    useWalletStore.setState({ networkId: "bsc-testnet" });
    const { container } = render(<EvmFaucetButton />);
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe("https://testnet.bnbchain.org/faucet-smart");
    expect(link.target).toBe("_blank");
  });
});

describe("EvmFaucetButton — mainnets (rendu nul)", () => {
  it("Ethereum mainnet → null", () => {
    useWalletStore.setState({ networkId: "ethereum-mainnet" });
    const { container } = render(<EvmFaucetButton />);
    expect(container.firstChild).toBeNull();
  });

  it("BSC mainnet → null", () => {
    useWalletStore.setState({ networkId: "bsc" });
    const { container } = render(<EvmFaucetButton />);
    expect(container.firstChild).toBeNull();
  });

  it("Base → null", () => {
    useWalletStore.setState({ networkId: "base" });
    const { container } = render(<EvmFaucetButton />);
    expect(container.firstChild).toBeNull();
  });

  it("Arbitrum One → null", () => {
    useWalletStore.setState({ networkId: "arbitrum-one" });
    const { container } = render(<EvmFaucetButton />);
    expect(container.firstChild).toBeNull();
  });
});

describe("EvmFaucetButton — cas d'erreur", () => {
  it("networkId inconnu → null", () => {
    useWalletStore.setState({ networkId: "unknown-evm-net" });
    const { container } = render(<EvmFaucetButton />);
    expect(container.firstChild).toBeNull();
  });

  it("networkId SANGO → null (pas un réseau EVM)", () => {
    useWalletStore.setState({ networkId: "sango-devnet" });
    const { container } = render(<EvmFaucetButton />);
    expect(container.firstChild).toBeNull();
  });
});
