import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AggregatedTx } from "@/hooks/use-aggregated-history";

const mockAggregated = vi.fn();
vi.mock("@/hooks/use-aggregated-history", () => ({
  useAggregatedHistory: () => mockAggregated(),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { RecentActivityAggregated } from "./recent-activity-aggregated";

afterEach(() => {
  cleanup();
  mockAggregated.mockReset();
});

function makeTx(overrides: Partial<AggregatedTx> = {}): AggregatedTx {
  return {
    networkId: "ethereum-mainnet",
    txHash: "0xabc",
    source: "evm",
    timestamp: 1_700_000_000,
    blockHeight: 100,
    status: "confirmed",
    direction: "in",
    symbol: "ETH",
    amount: 0.5,
    counterparty: "0x1234567890abcdef1234567890abcdef12345678",
    contract: null,
    ...overrides,
  };
}

function renderComponent() {
  return render(
    <MemoryRouter>
      <RecentActivityAggregated />
    </MemoryRouter>,
  );
}

describe("RecentActivityAggregated — Phase 9.3", () => {
  it("affiche un état vide quand pas de tx ni d'erreur", () => {
    mockAggregated.mockReturnValue({
      txs: [],
      loading: false,
      isFetching: false,
      sourceErrors: [],
      refetch: () => {},
    });
    renderComponent();
    expect(screen.getByText(/Aucune transaction/i)).toBeTruthy();
  });

  it("affiche 'loading' quand tx vides + loading", () => {
    mockAggregated.mockReturnValue({
      txs: [],
      loading: true,
      isFetching: false,
      sourceErrors: [],
      refetch: () => {},
    });
    renderComponent();
    expect(screen.getByText(/Chargement/i)).toBeTruthy();
  });

  it("affiche une tx reçue avec signe +", () => {
    mockAggregated.mockReturnValue({
      txs: [makeTx({ direction: "in", symbol: "ETH", amount: 0.5 })],
      loading: false,
      isFetching: false,
      sourceErrors: [],
      refetch: () => {},
    });
    renderComponent();
    expect(screen.getByText(/Reçue ETH/)).toBeTruthy();
  });

  it("affiche une tx envoyée avec signe -", () => {
    mockAggregated.mockReturnValue({
      txs: [makeTx({ direction: "out", symbol: "BTC", amount: 0.01 })],
      loading: false,
      isFetching: false,
      sourceErrors: [],
      refetch: () => {},
    });
    renderComponent();
    expect(screen.getByText(/Envoyée BTC/)).toBeTruthy();
  });

  it("affiche 'pending' badge pour une tx sans blockHeight", () => {
    mockAggregated.mockReturnValue({
      txs: [
        makeTx({
          status: "pending",
          blockHeight: null,
          timestamp: null,
        }),
      ],
      loading: false,
      isFetching: false,
      sourceErrors: [],
      refetch: () => {},
    });
    renderComponent();
    expect(screen.getByText(/en attente/)).toBeTruthy();
  });

  it("affiche un bandeau si sourceErrors non vide (et 0 tx)", () => {
    mockAggregated.mockReturnValue({
      txs: [],
      loading: false,
      isFetching: false,
      sourceErrors: ["base", "arbitrum-one"],
      refetch: () => {},
    });
    renderComponent();
    expect(screen.getByText(/Indisponible/)).toBeTruthy();
  });
});
