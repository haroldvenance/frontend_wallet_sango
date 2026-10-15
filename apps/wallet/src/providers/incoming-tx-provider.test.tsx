import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AggregatedTx,
  UseAggregatedHistoryResult,
} from "@/hooks/use-aggregated-history";

// vi.hoisted — les spies doivent être déclarés AVANT que les
// factories vi.mock soient hoistées par Vitest. Sans ça, la factory
// capture une référence TDZ sur les const du module test.
const { incomingSpy, mockHistory, tStable } = vi.hoisted(() => ({
  incomingSpy: vi.fn(),
  mockHistory: vi.fn(),
  tStable: {
    incomingTx: {
      title: "+{amount} {symbol} recu",
      pending: "EN_ATTENTE",
    },
  },
}));

vi.mock("@/hooks/use-aggregated-history", () => ({
  useAggregatedHistory: () => mockHistory(),
}));

vi.mock("@/lib/notify", () => ({
  notify: {
    incoming: (...args: unknown[]) => incomingSpy(...args),
  },
}));

// Mock i18n retourne un objet STABLE (sinon t change à chaque render
// → useEffect re-run en boucle).
vi.mock("@/i18n/use-translation", () => ({
  useTranslation: () => tStable,
}));

import { useIncomingTxStore } from "@/stores/incoming-tx-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useWalletStore } from "@/stores/wallet-store";

import { IncomingTxProvider } from "./incoming-tx-provider";

function tx(over: Partial<AggregatedTx> = {}): AggregatedTx {
  return {
    networkId: "ethereum-mainnet",
    txHash: "0xabc",
    source: "evm",
    timestamp: 1,
    blockHeight: 1,
    status: "confirmed",
    direction: "in",
    symbol: "ETH",
    amount: 1.5,
    fee: null,
    counterparty: "0x1234567890abcdef",
    contract: null,
    ...over,
  };
}

function withTxs(txs: AggregatedTx[]): UseAggregatedHistoryResult {
  return {
    txs,
    loading: false,
    isFetching: false,
    sourceErrors: [],
    refetch: vi.fn(),
  };
}

beforeEach(() => {
  incomingSpy.mockReset();
  mockHistory.mockReset();
  // Valeur par défaut — évite un undefined.length si un test l'oublie.
  mockHistory.mockReturnValue(withTxs([]));
  useIncomingTxStore.setState({ seenKeys: {} });
  usePreferencesStore.setState({ incomingNotificationsEnabled: true });
  useWalletStore.setState({ status: "unlocked" });
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderProvider() {
  return render(
    <IncomingTxProvider>
      <div data-testid="child" />
    </IncomingTxProvider>,
  );
}

describe("IncomingTxProvider — Phase 12-C", () => {
  it("ne monte pas le watcher si status !== unlocked", () => {
    useWalletStore.setState({ status: "locked" });
    mockHistory.mockReturnValue(withTxs([tx()]));
    renderProvider();
    expect(mockHistory).not.toHaveBeenCalled();
  });

  it("bootstrap : premier chargement marque sans notifier", async () => {
    mockHistory.mockReturnValue(
      withTxs([tx({ txHash: "0x1" }), tx({ txHash: "0x2" })]),
    );
    renderProvider();
    await waitFor(() => {
      expect(
        useIncomingTxStore.getState().seenKeys["ethereum-mainnet"],
      ).toEqual(["0x1", "0x2"]);
    });
    expect(incomingSpy).not.toHaveBeenCalled();
  });

  it("nouvelle tx apres bootstrap -> notification", async () => {
    useIncomingTxStore.setState({
      seenKeys: { "ethereum-mainnet": ["0x1"] },
    });
    mockHistory.mockReturnValue(
      withTxs([tx({ txHash: "0x1" }), tx({ txHash: "0x2" })]),
    );
    renderProvider();
    await waitFor(() => {
      expect(incomingSpy).toHaveBeenCalled();
    });
    const message = incomingSpy.mock.calls[0]?.[0] as string;
    expect(message).toContain("ETH");
    expect(message).toMatch(/1[.,]5/);
  });

  it("tx identique deja vue -> pas de notification", async () => {
    useIncomingTxStore.setState({
      seenKeys: { "ethereum-mainnet": ["0x1"] },
    });
    mockHistory.mockReturnValue(withTxs([tx({ txHash: "0x1" })]));
    renderProvider();
    await waitFor(() => {
      expect(
        useIncomingTxStore.getState().seenKeys["ethereum-mainnet"],
      ).toEqual(["0x1"]);
    });
    expect(incomingSpy).not.toHaveBeenCalled();
  });

  it("ignore direction != in", async () => {
    useIncomingTxStore.setState({
      seenKeys: { "ethereum-mainnet": ["0xold"] },
    });
    mockHistory.mockReturnValue(
      withTxs([
        tx({ txHash: "0xsent", direction: "out" }),
        tx({ txHash: "0xrecv", direction: "in" }),
      ]),
    );
    renderProvider();
    await waitFor(() => {
      expect(incomingSpy).toHaveBeenCalled();
    });
    // Vérifie qu'une seule notif a été émise (pour la tx "in").
    // "out" a un hash unique → si le filter échouait, on aurait 2 appels.
    const calls = incomingSpy.mock.calls.map((c) => c[0] as string);
    expect(calls).toHaveLength(1);
  });

  it("statut pending ajoute a la description", async () => {
    useIncomingTxStore.setState({
      seenKeys: { "ethereum-mainnet": [] },
    });
    mockHistory.mockReturnValue(
      withTxs([tx({ txHash: "0xpending", status: "pending" })]),
    );
    renderProvider();
    await waitFor(() => {
      expect(incomingSpy).toHaveBeenCalled();
    });
    const opts = incomingSpy.mock.calls[0]?.[1] as { description: string };
    expect(opts.description).toContain("EN_ATTENTE");
  });

  it("multi-reseaux isoles (bootstrap separe)", async () => {
    mockHistory.mockReturnValue(
      withTxs([
        tx({ networkId: "ethereum-mainnet", txHash: "0xeth" }),
        tx({ networkId: "bsc", txHash: "0xbsc" }),
      ]),
    );
    renderProvider();
    await waitFor(() => {
      expect(
        useIncomingTxStore.getState().seenKeys["ethereum-mainnet"],
      ).toEqual(["0xeth"]);
    });
    expect(useIncomingTxStore.getState().seenKeys["bsc"]).toEqual(["0xbsc"]);
    expect(incomingSpy).not.toHaveBeenCalled();
  });

  it("markSeen meme si toggle incoming off", async () => {
    usePreferencesStore.setState({ incomingNotificationsEnabled: false });
    useIncomingTxStore.setState({
      seenKeys: { "ethereum-mainnet": ["0x1"] },
    });
    mockHistory.mockReturnValue(withTxs([tx({ txHash: "0x2" })]));
    renderProvider();
    await waitFor(() => {
      expect(
        useIncomingTxStore.getState().seenKeys["ethereum-mainnet"],
      ).toContain("0x2");
    });
  });
});
