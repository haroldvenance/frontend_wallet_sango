import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetSelect, type AssetSelectOption } from "./asset-select";

afterEach(cleanup);

const OPTIONS: AssetSelectOption[] = [
  {
    id: "eth",
    assetId: "eth",
    symbol: "ETH",
    name: "ETH · natif",
    balance: "0.5",
    isNative: true,
  },
  {
    id: "0xusdc",
    assetId: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    balance: "100",
    isNative: false,
  },
];

describe("AssetSelect — Phase 10.3", () => {
  it("affiche l'option sélectionnée dans le trigger", () => {
    render(<AssetSelect value="eth" onChange={() => {}} options={OPTIONS} />);
    expect(screen.getByTestId("asset-select-trigger").textContent).toContain(
      "ETH",
    );
    expect(screen.getByTestId("asset-select-trigger").textContent).toContain(
      "0.5",
    );
  });

  it("le trigger ferme par défaut (pas de listbox)", () => {
    render(<AssetSelect value="eth" onChange={() => {}} options={OPTIONS} />);
    expect(screen.queryByTestId("asset-select-listbox")).toBeNull();
  });

  it("clic sur le trigger ouvre le popover", () => {
    render(<AssetSelect value="eth" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(screen.getByTestId("asset-select-trigger"));
    expect(screen.getByTestId("asset-select-listbox")).toBeTruthy();
  });

  it("liste toutes les options dans le popover", () => {
    render(<AssetSelect value="eth" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(screen.getByTestId("asset-select-trigger"));
    expect(screen.getByTestId("asset-select-option-eth")).toBeTruthy();
    expect(screen.getByTestId("asset-select-option-usdc")).toBeTruthy();
  });

  it("clic sur une option appelle onChange + ferme", () => {
    const onChange = vi.fn();
    render(<AssetSelect value="eth" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByTestId("asset-select-trigger"));
    fireEvent.click(screen.getByTestId("asset-select-option-usdc"));
    expect(onChange).toHaveBeenCalledWith("0xusdc");
    expect(screen.queryByTestId("asset-select-listbox")).toBeNull();
  });

  it("badge NATIF affiché sur le trigger pour l'option native", () => {
    render(<AssetSelect value="eth" onChange={() => {}} options={OPTIONS} />);
    expect(
      screen.getByTestId("asset-select-trigger").textContent,
    ).toContain("NATIF");
  });

  it("badge NATIF absent quand un token est sélectionné", () => {
    render(
      <AssetSelect value="0xusdc" onChange={() => {}} options={OPTIONS} />,
    );
    expect(
      screen.getByTestId("asset-select-trigger").textContent,
    ).not.toContain("NATIF");
  });

  it("Escape ferme le popover", () => {
    render(<AssetSelect value="eth" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(screen.getByTestId("asset-select-trigger"));
    expect(screen.getByTestId("asset-select-listbox")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("asset-select-listbox")).toBeNull();
  });
});
