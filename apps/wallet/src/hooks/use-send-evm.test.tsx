import { asAddress } from "@sango/wallet-chains";
import type { WalletSession } from "@sango/wallet-session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { useSendEvm } from "./use-send-evm";

/**
 * 🔒 useSendEvm — résolution `nativeAsset` par réseau (E1.7.f)
 *
 * Vérifie que la pile suivante est cohérente bout-en-bout :
 *   wallet-store.networkId → useNetworkQueryContext.nativeAsset
 *     → session.send(assetRef.assetId)
 *
 * Le hook NE DOIT PAS hardcoder "eth" : sur BSC, l'assetRef est "bnb".
 */

const TO = asAddress("bb".repeat(20));
const TX_HASH = "0x" + "00".repeat(32);

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
  // Type explicitement les args (sinon `mock.calls[0]` est un tuple vide).
  type SendFn = (
    params: { assetRef: { assetId: string } },
    account: unknown,
  ) => Promise<string>;
  const send = vi.fn<SendFn>(async () => TX_HASH);
  return {
    session: { send } as unknown as WalletSession,
    send,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
});

describe("🔒 useSendEvm — nativeAsset par réseau", () => {
  it("Ethereum Mainnet → assetId='eth'", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-mainnet",
    family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useSendEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ to: TO, amountBaseUnits: 1_000_000n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "transfer",
        to: TO,
        assetRef: {
          kind: "native",
          assetId: "eth",
          networkId: "ethereum-mainnet",
        },
      }),
      expect.anything(),
    );
  });

  it("BSC Mainnet → assetId='bnb' (pas 'eth')", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc",
    family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useSendEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ to: TO, amountBaseUnits: 1_000_000n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "transfer",
        assetRef: {
          kind: "native",
          assetId: "bnb",
          networkId: "bsc",
        },
      }),
      expect.anything(),
    );
  });

  it("BSC Testnet → assetId='bnb' (D-E1.7-2, pas 'tbnb')", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "bsc-testnet",
    family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useSendEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ to: TO, amountBaseUnits: 1_000_000n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = send.mock.calls[0]![0];
    expect(call.assetRef.assetId).toBe("bnb");
  });

  it("réseau inconnu → erreur avant tout appel à session.send", async () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "unknown-evm-net",
      // Phase 4.1-fix — `family` explicite. Auparavant, ce test
      // passait par pollution d'un test précédent (family="evm").
      family: "evm",
    });
    const { session, send } = makeSession();
    const qc = makeQc();

    const { result } = renderHook(() => useSendEvm(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ to: TO, amountBaseUnits: 1_000_000n });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/nativeAsset introuvable/);
    expect(send).not.toHaveBeenCalled();
  });
});
