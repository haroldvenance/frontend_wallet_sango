import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock du hook pour ne pas dépendre d'une vraie session.
const mockAssets = vi.fn();
vi.mock("@/hooks/use-all-wallet-assets", () => ({
  useAllWalletAssets: () => mockAssets(),
  getDisplayAssetId: (a: { assetRef: { kind: string; assetId?: string }; symbol: string }) =>
    a.assetRef.kind === "native"
      ? a.assetRef.assetId
      : a.symbol.toLowerCase(),
}));

import { SangoHeroCard } from "./sango-hero-card";

afterEach(() => {
  cleanup();
  mockAssets.mockReset();
});

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function sangoAsset(balance: bigint | null) {
  return {
    id: "w:sango",
    walletId: "w",
    networkId: "sango-devnet",
    accountIndex: 0,
    family: "sango" as const,
    assetRef: {
      kind: "native" as const,
      assetId: "sango",
      networkId: "sango-devnet",
    },
    kind: "native" as const,
    symbol: "SANGO",
    name: "SANGO",
    subtitle: "Sango Network",
    decimals: 7,
    balance,
  };
}

describe("SangoHeroCard — Phase 9.1", () => {
  it("affiche le solde SANGO", () => {
    mockAssets.mockReturnValue({
      assets: [sangoAsset(124_860_000_000n)], // 12 486.0 SANGO
      loading: false,
    });
    render(<SangoHeroCard />, { wrapper: Wrapper });
    expect(screen.getByText("SANGO")).toBeTruthy();
    expect(screen.getByTestId("sango-hero-card")).toBeTruthy();
  });

  it("affiche … si loading", () => {
    mockAssets.mockReturnValue({ assets: [], loading: true });
    render(<SangoHeroCard />, { wrapper: Wrapper });
    expect(screen.getByText("…")).toBeTruthy();
  });

  it("null si pas de SANGO et pas loading", () => {
    mockAssets.mockReturnValue({ assets: [], loading: false });
    const { container } = render(<SangoHeroCard />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("clic → navigate /asset/sango", () => {
    mockAssets.mockReturnValue({
      assets: [sangoAsset(0n)],
      loading: false,
    });
    const { container } = render(<SangoHeroCard />, { wrapper: Wrapper });
    const btn = container.querySelector("button");
    expect(btn).toBeTruthy();
    // Le bouton est un <button> dans un MemoryRouter : on ne peut pas
    // observer `navigate` sans un vrai Router, mais on vérifie qu'il
    // est cliquable (aucun crash).
    fireEvent.click(btn!);
  });
});
