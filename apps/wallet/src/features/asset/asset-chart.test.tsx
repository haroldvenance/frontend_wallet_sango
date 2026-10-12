import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetChart } from "./asset-chart";

afterEach(cleanup);

const sample = {
  current: 100,
  change24hPct: 2.5,
  points: [
    { t: 1_700_000_000_000, p: 90 },
    { t: 1_700_086_400_000, p: 100 },
  ],
};

describe("AssetChart — Phase 6", () => {
  it("affiche 5 timeframes quand disponible", () => {
    render(
      <AssetChart
        data={sample}
        loading={false}
        error={false}
        timeframe="1d"
        onTimeframeChange={() => {}}
        unavailable={false}
      />,
    );
    expect(screen.getByTestId("chart-tf-1d")).toBeTruthy();
    expect(screen.getByTestId("chart-tf-1w")).toBeTruthy();
    expect(screen.getByTestId("chart-tf-1m")).toBeTruthy();
    expect(screen.getByTestId("chart-tf-1y")).toBeTruthy();
    expect(screen.getByTestId("chart-tf-all")).toBeTruthy();
  });

  it("appelle onTimeframeChange au clic", () => {
    const cb = vi.fn();
    render(
      <AssetChart
        data={sample}
        loading={false}
        error={false}
        timeframe="1d"
        onTimeframeChange={cb}
        unavailable={false}
      />,
    );
    fireEvent.click(screen.getByTestId("chart-tf-1w"));
    expect(cb).toHaveBeenCalledWith("1w");
  });

  it("affiche 'unavailable' sans timeframes quand asset non listé", () => {
    render(
      <AssetChart
        data={null}
        loading={false}
        error={false}
        timeframe="1d"
        onTimeframeChange={() => {}}
        unavailable={true}
      />,
    );
    expect(screen.queryByTestId("chart-tf-1d")).toBeNull();
    expect(screen.getByText(/indisponibles/i)).toBeTruthy();
  });

  it("affiche 'loading' pendant le fetch", () => {
    render(
      <AssetChart
        data={null}
        loading={true}
        error={false}
        timeframe="1d"
        onTimeframeChange={() => {}}
        unavailable={false}
      />,
    );
    expect(screen.getByText(/Chargement/i)).toBeTruthy();
  });

  it("affiche 'error' si l'API échoue", () => {
    render(
      <AssetChart
        data={null}
        loading={false}
        error={true}
        timeframe="1d"
        onTimeframeChange={() => {}}
        unavailable={false}
      />,
    );
    expect(screen.getByText(/Impossible de charger/i)).toBeTruthy();
  });
});
