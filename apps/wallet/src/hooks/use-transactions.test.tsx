import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TxDetail, TxDetailPage } from "@sango/wallet-chains";
import type { Wallet } from "@sango/wallet-core";
import type { WalletSession } from "@sango/wallet-session";
import { asAddress, asHash, asPublicKey } from "@sango/wallet-chains";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import {
  useInfiniteTransactions,
  useTransaction,
  useTransactions,
} from "./use-transactions";

const ADDRESS_HEX = "0x" + "aa".repeat(20);
const HASH = asHash("ee".repeat(32));

const fakeWallet = {
  identity: {
    addressHex: ADDRESS_HEX,
    publicKey: new Uint8Array(32).fill(0xcc),
    address: new Uint8Array(20).fill(0xaa),
    addressBech32: "tsango1fake",
    network: "testnet",
  },
} as unknown as Wallet;

const FIXTURE_TX: TxDetail = {
  hash: HASH,
  kind: "native",
  blockHeight: 42,
  blockHash: asHash("dd".repeat(32)),
  txIndex: 0,
  version: 1,
  chainId: asHash("11".repeat(32)),
  nonce: 7,
  sender: asAddress("aa".repeat(20)),
  publicKey: asPublicKey("cc".repeat(32)),
  gasLimit: 21_000,
  maxFee: "20",
  priorityFee: "2",
  value: "100",
  txKind: 0x01,
  recipient: asAddress("bb".repeat(20)),
  data: asHash(""),
  signature: asHash("ee".repeat(64)),
  success: true,
  gasUsed: 21_000,
};

const FIXTURE_PAGE: TxDetailPage = {
  total: 1,
  offset: 0,
  limit: 20,
  items: [FIXTURE_TX],
};

function makeWrapper(session: WalletSession | null, qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <WalletSessionContext.Provider value={session}>
          {children}
        </WalletSessionContext.Provider>
      </QueryClientProvider>
    );
  };
}

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
  useWalletStore.setState({
    format: "sango-legacy",
    wallet: fakeWallet,
    status: "unlocked",
    activeId: ADDRESS_HEX,
    network: "testnet",
  });
});

// --- useTransactions -------------------------------------------------------

describe("useTransactions (session-backed)", () => {
  it("delegates to session.getTransactionPage(account, limit, offset)", async () => {
    const getTransactionPage = vi.fn(async () => FIXTURE_PAGE);
    const session = { getTransactionPage } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useTransactions({ limit: 5 }), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTransactionPage).toHaveBeenCalledWith(
      { family: "sango", accountIndex: 0, networkId: "sango-devnet" },
      5,
      0,
    );
    // API publique : TxPage (de @sango/rpc), pas TxDetailPage.
    expect(result.current.data).toEqual({
      total: 1,
      offset: 0,
      limit: 20,
      items: [expect.objectContaining({ hash: HASH, txKind: 0x01 })],
    });

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual([
      "txs",
      "http://test",
      "sango-devnet",
      ADDRESS_HEX,
      5,
      0,
    ]);
  });

  it("stays idle when session is null", () => {
    const qc = makeQc();
    const { result } = renderHook(() => useTransactions(), {
      wrapper: makeWrapper(null, qc),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

// --- useTransaction --------------------------------------------------------

describe("useTransaction (session-backed)", () => {
  it("delegates to session.getTransactionByHash(networkId, hash)", async () => {
    const getTransactionByHash = vi.fn(async () => FIXTURE_TX);
    const session = { getTransactionByHash } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useTransaction(HASH), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTransactionByHash).toHaveBeenCalledWith("sango-devnet", HASH);
    expect(result.current.data!.hash).toBe(HASH);
    expect(result.current.data!.txKind).toBe(0x01);
  });

  it("returns null for unknown hash", async () => {
    const session = {
      getTransactionByHash: vi.fn(async () => null),
    } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useTransaction(HASH), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("stays idle when hash is null", () => {
    const qc = makeQc();
    const session = {
      getTransactionByHash: vi.fn(),
    } as unknown as WalletSession;
    const { result } = renderHook(() => useTransaction(null), {
      wrapper: makeWrapper(session, qc),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

// --- useInfiniteTransactions ----------------------------------------------

describe("useInfiniteTransactions (session-backed)", () => {
  it("delegates to session.getTransactionPage with pagination", async () => {
    const getTransactionPage = vi.fn(async () => FIXTURE_PAGE);
    const session = { getTransactionPage } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useInfiniteTransactions(20), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTransactionPage).toHaveBeenCalledWith(
      { family: "sango", accountIndex: 0, networkId: "sango-devnet" },
      20,
      0,
    );
    expect(result.current.data!.pages[0]!.items).toHaveLength(1);
  });
});
