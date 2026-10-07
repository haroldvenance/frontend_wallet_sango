import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useWalletStore } from "@/stores/wallet-store";
import { BitcoinFaucetButton } from "./bitcoin-faucet-button";

/**
 * 🔒 BitcoinFaucetButton — E2.1.b.6.4
 *
 * Vérifie :
 *   - lien vers l'URL centralisée
 *   - target="_blank" + rel="noopener noreferrer"
 *   - rendu nul sur un réseau non-testnet Bitcoin
 */

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useWalletStore.setState({
    format: "bip39",
    status: "unlocked",
    networkId: "bitcoin-testnet",
    family: "bitcoin",
  });
});

describe("BitcoinFaucetButton — testnet", () => {
  it("rend un lien externe vers coinfaucet.eu", () => {
    const { container } = render(<BitcoinFaucetButton />);
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe("https://coinfaucet.eu/en/btc-testnet/");
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
  });

  it("ne s'affiche pas sur bitcoin-mainnet", () => {
    useWalletStore.setState({
      networkId: "bitcoin-mainnet",
      family: "bitcoin",
    });
    const { container } = render(<BitcoinFaucetButton />);
    expect(container.firstChild).toBeNull();
  });
});
