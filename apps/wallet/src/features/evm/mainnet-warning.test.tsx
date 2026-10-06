import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MainnetWarning } from "./mainnet-warning";

/**
 * 🔒 MainnetWarning — E2.3.a.3 (D-E2.3-3)
 *
 * Matrice stricte :
 *   - 4 mainnets EVM     → bandeau rendu
 *   - 2 testnets EVM     → null
 *   - networkId inconnu  → null
 *   - networkId SANGO    → null
 *
 * `evmNetworkById()` + `isTestnet` sont la source de vérité — aucun
 * liste locale. Ce test vérifie l'intégration au registre, pas un
 * hardcode.
 */

afterEach(() => {
  cleanup();
});

describe("MainnetWarning — mainnets EVM (rendu attendu)", () => {
  it("Ethereum Mainnet → bandeau", () => {
    render(<MainnetWarning networkId="ethereum-mainnet" />);
    expect(screen.getByTestId("mainnet-warning")).toBeDefined();
  });

  it("Base → bandeau", () => {
    render(<MainnetWarning networkId="base" />);
    expect(screen.getByTestId("mainnet-warning")).toBeDefined();
  });

  it("Arbitrum One → bandeau", () => {
    render(<MainnetWarning networkId="arbitrum-one" />);
    expect(screen.getByTestId("mainnet-warning")).toBeDefined();
  });

  it("BSC → bandeau", () => {
    render(<MainnetWarning networkId="bsc" />);
    expect(screen.getByTestId("mainnet-warning")).toBeDefined();
  });
});

describe("MainnetWarning — testnets EVM (rendu nul)", () => {
  it("Ethereum Sepolia → null", () => {
    const { container } = render(
      <MainnetWarning networkId="ethereum-sepolia" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("BSC Testnet → null", () => {
    const { container } = render(
      <MainnetWarning networkId="bsc-testnet" />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("MainnetWarning — cas d'erreur (rendu nul)", () => {
  it("networkId inconnu → null", () => {
    const { container } = render(
      <MainnetWarning networkId="unknown-evm-net" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("networkId SANGO → null", () => {
    const { container } = render(
      <MainnetWarning networkId="sango-devnet" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("networkId vide → null", () => {
    const { container } = render(<MainnetWarning networkId="" />);
    expect(container.firstChild).toBeNull();
  });
});

describe("MainnetWarning — contenu", () => {
  it("le message contient le rappel 'fonds réels'", () => {
    render(<MainnetWarning networkId="ethereum-mainnet" />);
    expect(screen.getByTestId("mainnet-warning").textContent).toMatch(
      /fonds réels/,
    );
  });

  it("className est bien propagé", () => {
    render(
      <MainnetWarning networkId="base" className="custom-xyz" />,
    );
    const el = screen.getByTestId("mainnet-warning");
    expect(el.className).toContain("custom-xyz");
  });
});
