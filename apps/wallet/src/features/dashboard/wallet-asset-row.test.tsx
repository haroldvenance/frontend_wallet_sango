import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WalletAsset } from "@/hooks/use-all-wallet-assets";

import { WalletAssetRow } from "./wallet-asset-row";

afterEach(cleanup);

function makeAsset(overrides: Partial<WalletAsset> = {}): WalletAsset {
  const base: WalletAsset = {
    id: "w:eth",
    walletId: "w",
    networkId: "ethereum-mainnet",
    accountIndex: 0,
    family: "evm",
    assetRef: {
      kind: "native",
      assetId: "eth",
      networkId: "ethereum-mainnet",
    },
    kind: "native",
    symbol: "ETH",
    name: "ETH",
    subtitle: "Ethereum",
    decimals: 18,
    balance: 452_000_000_000_000_000n, // 0.452 ETH
  };
  return { ...base, ...overrides };
}

describe("WalletAssetRow — Phase 8", () => {
  it("affiche le symbole, la balance et la valeur fiat", () => {
    render(
      <WalletAssetRow
        asset={makeAsset()}
        price={{ usd: 2500, change24hPct: -1.29 }}
        onClick={() => {}}
      />,
    );
    // "ETH" apparaît 2× (symbole + suffixe balance) → getAllByText.
    expect(screen.getAllByText("ETH").length).toBeGreaterThan(0);
    expect(screen.getByText("0.452")).toBeTruthy();
    // 0.452 × 2500 = 1130
    expect(screen.getByText(/\$1,130/)).toBeTruthy();
  });

  it("affiche '—' si pas de prix (SANGO non listé)", () => {
    render(
      <WalletAssetRow
        asset={makeAsset({
          assetRef: {
            kind: "native",
            assetId: "sango",
            networkId: "sango-devnet",
          },
          symbol: "SANGO",
        })}
        price={undefined}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("SANGO a un style distinctif (badge NATIF)", () => {
    render(
      <WalletAssetRow
        asset={makeAsset({
          assetRef: {
            kind: "native",
            assetId: "sango",
            networkId: "sango-devnet",
          },
          symbol: "SANGO",
        })}
        price={undefined}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("NATIF")).toBeTruthy();
  });

  it("affiche la variation 24h (positive en vert)", () => {
    render(
      <WalletAssetRow
        asset={makeAsset()}
        price={{ usd: 2500, change24hPct: 2.5 }}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("+2.50%")).toBeTruthy();
  });

  it("appelle onClick au clic", () => {
    const cb = vi.fn();
    render(
      <WalletAssetRow
        asset={makeAsset()}
        price={{ usd: 2500, change24hPct: null }}
        onClick={cb}
      />,
    );
    fireEvent.click(screen.getByTestId("wallet-asset-row-eth"));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
