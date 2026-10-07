import { asAddress } from "@sango/wallet-chains";
import type { WalletSession } from "@sango/wallet-session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useSendBitcoin } from "./use-send-bitcoin";

const TO = asAddress("tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97");
const TXID = "a".repeat(64);

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
    defaultOptions: {
      queries: { retry: false, gcTime: 60_000 },
      mutations: { retry: false },
    },
  });
}

function makeSession() {
  type SendFn = (
    params: {
      kind: string;
      to: string;
      amount: bigint;
      feeRate: bigint;
      assetRef: { kind: string; assetId: string; networkId: string };
    },
    account: unknown,
  ) => Promise<string>;
  const send = vi.fn<SendFn>(async () => TXID);
  return { session: { send } as unknown as WalletSession, send };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
  useWalletStore.setState({
    format: "bip39",
    status: "unlocked",
    networkId: "bitcoin-testnet",
    family: "bitcoin",
  });
});

describe("useSendBitcoin — mapping SendParams", () => {
  it("envoie un transferBitcoin avec feeRate explicite", async () => {
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useSendBitcoin(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({
      to: TO,
      amountSats: 50_000n,
      feeRate: 5n,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [params] = send.mock.calls[0]!;
    expect(params.kind).toBe("transferBitcoin");
    expect(params.to).toBe(TO);
    expect(params.amount).toBe(50_000n);
    expect(params.feeRate).toBe(5n);
    expect(params.assetRef).toEqual({
      kind: "native",
      assetId: "btc",
      networkId: "bitcoin-testnet",
    });
    expect(result.current.data?.txId).toBe(TXID);
  });

  it("rejette si family ≠ bitcoin", async () => {
    useWalletStore.setState({ family: "evm", networkId: "ethereum-sepolia" });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useSendBitcoin(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ to: TO, amountSats: 1n, feeRate: 1n });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/family="evm"/);
    expect(send).not.toHaveBeenCalled();
  });

  it("erreur si WalletSession indisponible", async () => {
    const qc = makeQc();
    const { result } = renderHook(() => useSendBitcoin(), {
      wrapper: makeWrapper(null, qc),
    });
    result.current.mutate({ to: TO, amountSats: 1n, feeRate: 1n });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/WalletSession/);
  });
});
