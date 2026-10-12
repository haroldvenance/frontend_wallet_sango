import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { ReceiveAssetModal } from "./receive-asset-modal";

afterEach(cleanup);

const ADDRESS_EVM = "0xf4be22c80f8b6ee4a58ff9d3e5f4f7eb9a7fcff5";
const ADDRESS_BTC = "bc1qwa7zeha8y7rnp3eymx6vj4r0lgzr8q35wmjq2m";

describe("ReceiveAssetModal — Phase 6", () => {
  it("null si open=false", () => {
    const { container } = render(
      <ReceiveAssetModal
        open={false}
        onClose={() => {}}
        address={ADDRESS_EVM}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("affiche l'adresse EVM", () => {
    render(
      <ReceiveAssetModal
        open={true}
        onClose={() => {}}
        address={ADDRESS_EVM}
        symbol="ETH"
      />,
    );
    expect(screen.getByText(ADDRESS_EVM)).toBeTruthy();
  });

  it("affiche l'adresse Bitcoin", () => {
    render(
      <ReceiveAssetModal
        open={true}
        onClose={() => {}}
        address={ADDRESS_BTC}
        symbol="BTC"
      />,
    );
    expect(screen.getByText(ADDRESS_BTC)).toBeTruthy();
  });

  it("rend le canvas QR", () => {
    const { container } = render(
      <ReceiveAssetModal
        open={true}
        onClose={() => {}}
        address={ADDRESS_EVM}
      />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("X appelle onClose", () => {
    const onClose = vi.fn();
    render(
      <ReceiveAssetModal
        open={true}
        onClose={onClose}
        address={ADDRESS_EVM}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Fermer/i));
    expect(onClose).toHaveBeenCalled();
  });

  it("contient les 3 boutons Copy / Share / Download", () => {
    render(
      <ReceiveAssetModal
        open={true}
        onClose={() => {}}
        address={ADDRESS_EVM}
      />,
    );
    expect(screen.getByTestId("receive-copy")).toBeTruthy();
    expect(screen.getByTestId("receive-share")).toBeTruthy();
    expect(screen.getByTestId("receive-download")).toBeTruthy();
  });
});
