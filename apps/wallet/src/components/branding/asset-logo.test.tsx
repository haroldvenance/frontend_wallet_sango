import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AssetLogo } from "./asset-logo";

afterEach(cleanup);

describe("AssetLogo — Phase 5.6", () => {
  it("rend ETH pour assetId='eth'", () => {
    render(<AssetLogo assetId="eth" />);
    expect(screen.getByLabelText("Ethereum")).toBeTruthy();
  });

  it("rend BTC pour assetId='btc'", () => {
    render(<AssetLogo assetId="btc" />);
    expect(screen.getByLabelText("Bitcoin")).toBeTruthy();
  });

  it("rend BNB pour assetId='bnb'", () => {
    render(<AssetLogo assetId="bnb" />);
    expect(screen.getByLabelText("BNB Chain")).toBeTruthy();
  });

  it("rend USDC pour assetId='usdc'", () => {
    render(<AssetLogo assetId="usdc" />);
    expect(screen.getByLabelText("USDC")).toBeTruthy();
  });

  it("rend USDT pour assetId='usdt'", () => {
    render(<AssetLogo assetId="usdt" />);
    expect(screen.getByLabelText("USDT")).toBeTruthy();
  });

  it("rend SANGO (image PNG)", () => {
    render(<AssetLogo assetId="sango" />);
    expect(screen.getByAltText("SANGO")).toBeTruthy();
  });

  it("accepte un assetId case-insensitive", () => {
    render(<AssetLogo assetId="ETH" />);
    expect(screen.getByLabelText("Ethereum")).toBeTruthy();
  });

  it("fallback pastille pour un asset inconnu", () => {
    render(<AssetLogo assetId="random" fallbackSymbol="RND" />);
    expect(screen.getByLabelText("RND")).toBeTruthy();
  });

  it("fallback utilise assetId si pas de fallbackSymbol", () => {
    render(<AssetLogo assetId="xyzabc" />);
    expect(screen.getByLabelText("XYZA")).toBeTruthy();
  });

  it("respecte la prop size", () => {
    const { container } = render(<AssetLogo assetId="eth" size={64} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("64");
    expect(svg?.getAttribute("height")).toBe("64");
  });
});
