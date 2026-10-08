import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ForgetWalletModal } from "./forget-wallet-modal";

afterEach(cleanup);

const noop = () => {};

describe("ForgetWalletModal — Phase 3.4", () => {
  it("null si open=false", () => {
    const { container } = render(
      <ForgetWalletModal
        open={false}
        walletPosition={2}
        busy={false}
        onCancel={noop}
        onConfirm={noop}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("null si walletPosition=null", () => {
    const { container } = render(
      <ForgetWalletModal
        open={true}
        walletPosition={null}
        busy={false}
        onCancel={noop}
        onConfirm={noop}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("bouton confirm désactivé si input vide", () => {
    render(
      <ForgetWalletModal
        open={true}
        walletPosition={2}
        busy={false}
        onCancel={noop}
        onConfirm={noop}
      />,
    );
    const btn = screen.getByTestId("forget-wallet-confirm");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("bouton confirm désactivé si input incorrect", () => {
    render(
      <ForgetWalletModal
        open={true}
        walletPosition={2}
        busy={false}
        onCancel={noop}
        onConfirm={noop}
      />,
    );
    const input = screen.getByLabelText(/Saisis/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Mon portefeuille" } });
    const btn = screen.getByTestId("forget-wallet-confirm");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("bouton confirm activé si input = 'Portefeuille 2'", () => {
    render(
      <ForgetWalletModal
        open={true}
        walletPosition={2}
        busy={false}
        onCancel={noop}
        onConfirm={noop}
      />,
    );
    const input = screen.getByLabelText(/Saisis/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Portefeuille 2" } });
    const btn = screen.getByTestId("forget-wallet-confirm");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("click confirm → onConfirm", () => {
    const onConfirm = vi.fn();
    render(
      <ForgetWalletModal
        open={true}
        walletPosition={2}
        busy={false}
        onCancel={noop}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByLabelText(/Saisis/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Portefeuille 2" } });
    fireEvent.click(screen.getByTestId("forget-wallet-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("click Annuler → onCancel", () => {
    const onCancel = vi.fn();
    render(
      <ForgetWalletModal
        open={true}
        walletPosition={2}
        busy={false}
        onCancel={onCancel}
        onConfirm={noop}
      />,
    );
    fireEvent.click(screen.getByText("Annuler"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
