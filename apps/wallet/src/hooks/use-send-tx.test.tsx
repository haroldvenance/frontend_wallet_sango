import { asPublicKey } from "@sango/wallet-chains";
import { asAddress } from "@sango/wallet-chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SangoClient } from "@sango/sdk";
import type { Wallet } from "@sango/wallet-core";
import type { WalletSession } from "@sango/wallet-session";

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
import { useSendTx } from "./use-send-tx";

const ADDRESS_HEX = asAddress("aa".repeat(20));
const TO_ADDRESS = (asAddress("bb".repeat(20))) as `0x${string}`;
const TX_HASH = asPublicKey("ee".repeat(32));

const fakeWallet = {
  identity: {
    addressHex: ADDRESS_HEX,
    publicKey: new Uint8Array(32).fill(0xcc),
    address: new Uint8Array(20).fill(0xaa),
    addressBech32: "tsango1fake",
    network: "testnet",
  },
} as unknown as Wallet;

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

beforeEach(() => {
  vi.clearAllMocks();
  useSdkStore.setState({
    endpoint: "http://test",
    customEndpoint: null,
  });
  useWalletStore.setState({
    wallet: fakeWallet,
    status: "unlocked",
    activeId: ADDRESS_HEX,
    network: "testnet",
  });
});

describe("useSendTx (session-backed)", () => {
  it("session.send → waitForInclusion → included", async () => {
    const send = vi.fn(async () => TX_HASH);
    const waitForInclusion = vi.fn(async () => ({ status: "included" as const }));
    const session = { send } as unknown as WalletSession;

    useSdkStore.setState({
      client: { waitForInclusion } as unknown as SangoClient,
    });

    const qc = makeQc();
    const { result } = renderHook(() => useSendTx(), {
      wrapper: makeWrapper(session, qc),
    });

    result.current.mutate({ to: TO_ADDRESS, amountBaseUnits: 1000n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ txHash: TX_HASH, included: true });

    // Pipeline passé par la session avec le bon SendParams + AccountRef.
    expect(send).toHaveBeenCalledWith(
      {
        kind: "transfer",
        to: TO_ADDRESS,
        assetRef: {
          kind: "native",
          assetId: "sango",
          networkId: "sango-devnet",
        },
        amount: 1000n,
      },
      {
        family: "sango",
        accountIndex: 0,
        networkId: "sango-devnet",
      },
    );

    // Poll d'inclusion sur le SDK (D-SESS-7).
    expect(waitForInclusion).toHaveBeenCalledWith(TX_HASH);
  });

  it("handles 'pending' → included: false", async () => {
    const session = {
      send: vi.fn(async () => TX_HASH),
    } as unknown as WalletSession;
    const waitForInclusion = vi.fn(async () => ({ status: "pending" as const }));
    useSdkStore.setState({
      client: { waitForInclusion } as unknown as SangoClient,
    });

    const qc = makeQc();
    const { result } = renderHook(() => useSendTx(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ to: TO_ADDRESS, amountBaseUnits: 1n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ txHash: TX_HASH, included: false });
  });

  it("errors when session is unavailable (locked wallet)", async () => {
    const qc = makeQc();
    const { result } = renderHook(() => useSendTx(), {
      wrapper: makeWrapper(null, qc),
    });
    result.current.mutate({ to: TO_ADDRESS, amountBaseUnits: 1n });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/WalletSession/);
  });

  it("propagates session.send() errors (e.g. fee fetch failure)", async () => {
    const send = vi.fn(async () => {
      throw new Error("SangoTransactionBuilder: baseFee unavailable");
    });
    const session = { send } as unknown as WalletSession;
    useSdkStore.setState({
      client: { waitForInclusion: vi.fn() } as unknown as SangoClient,
    });

    const qc = makeQc();
    const { result } = renderHook(() => useSendTx(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ to: TO_ADDRESS, amountBaseUnits: 1n });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/baseFee/);
  });
});
