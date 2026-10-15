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

const probeMock = vi.fn();
vi.mock("@/lib/probe-evm-endpoint", () => ({
  probeEvmEndpoint: (...args: unknown[]) => probeMock(...args),
}));

import { toast } from "sonner";

import { useEvmRpcStore } from "@/stores/evm-rpc-store";

import { EvmCustomRpcPanel } from "./evm-custom-rpc-panel";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useEvmRpcStore.setState({ customEndpoints: {} });
  probeMock.mockReset();
});

function expand() {
  fireEvent.click(screen.getByTestId("evm-custom-rpc-trigger"));
}

describe("EvmCustomRpcPanel", () => {
  it("collapsed par défaut, input caché", () => {
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expect(screen.queryByTestId("evm-custom-rpc-input")).toBeNull();
  });

  it("clic trigger → expand", () => {
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expand();
    expect(screen.getByTestId("evm-custom-rpc-input")).toBeTruthy();
  });

  it("URL invalide → toast, pas de probe, pas d'écriture store", () => {
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expand();
    fireEvent.change(screen.getByTestId("evm-custom-rpc-input"), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByTestId("evm-custom-rpc-save"));
    expect(probeMock).not.toHaveBeenCalled();
    expect(useEvmRpcStore.getState().customEndpoints).toEqual({});
    expect(toast.error).toHaveBeenCalled();
  });

  it("probe KO → toast, pas d'écriture store", async () => {
    probeMock.mockResolvedValue({ ok: false, message: "HTTP 500" });
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expand();
    fireEvent.change(screen.getByTestId("evm-custom-rpc-input"), {
      target: { value: "https://rpc.example.com" },
    });
    fireEvent.click(screen.getByTestId("evm-custom-rpc-save"));
    await screen.findByTestId("evm-custom-rpc-save");
    await new Promise((r) => setTimeout(r, 0));
    expect(useEvmRpcStore.getState().customEndpoints).toEqual({});
    expect(toast.error).toHaveBeenCalled();
  });

  it("probe OK → store écrit, toast succès redacté", async () => {
    probeMock.mockResolvedValue({ ok: true, chainId: 1 });
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expand();
    fireEvent.change(screen.getByTestId("evm-custom-rpc-input"), {
      target: { value: "https://rpc.example.com?apikey=SECRET" },
    });
    fireEvent.click(screen.getByTestId("evm-custom-rpc-save"));
    await new Promise((r) => setTimeout(r, 0));
    expect(useEvmRpcStore.getState().customEndpoints["ethereum-mainnet"]).toBe(
      "https://rpc.example.com?apikey=SECRET",
    );
    expect(toast.success).toHaveBeenCalled();
    const description = (toast.success as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1]?.description as string;
    expect(description).not.toContain("SECRET");
  });

  it("reset button visible uniquement si custom configuré", () => {
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expand();
    expect(screen.queryByTestId("evm-custom-rpc-reset")).toBeNull();

    useEvmRpcStore.setState({
      customEndpoints: { "ethereum-mainnet": "https://rpc.example.com" },
    });
    cleanup();
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expand();
    expect(screen.getByTestId("evm-custom-rpc-reset")).toBeTruthy();
  });

  it("reset → store nettoyé + toast", () => {
    useEvmRpcStore.setState({
      customEndpoints: { "ethereum-mainnet": "https://rpc.example.com" },
    });
    render(<EvmCustomRpcPanel networkId="ethereum-mainnet" />);
    expand();
    fireEvent.click(screen.getByTestId("evm-custom-rpc-reset"));
    expect(
      useEvmRpcStore.getState().customEndpoints["ethereum-mainnet"],
    ).toBeUndefined();
    expect(toast.success).toHaveBeenCalled();
  });
});
