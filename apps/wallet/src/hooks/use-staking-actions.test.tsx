import { asPublicKey } from "@sango/wallet-chains";
import { asAddress } from "@sango/wallet-chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AddressHex } from "@sango/types";
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
import {
  useBond,
  useClaimRewards,
  useDelegate,
  useRegisterValidator,
  useUnbond,
  useUndelegate,
  useUnjail,
  useUpdateCommission,
} from "./use-staking-actions";

const ADDRESS_HEX = asAddress("aa".repeat(20));
const VALIDATOR = (asAddress("dd".repeat(20))) as AddressHex;
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

/** Session mockée : `send` retourne TX_HASH. */
function makeSession() {
  const send = vi.fn(async () => TX_HASH);
  return { session: { send } as unknown as WalletSession, send };
}

/** Client mocké : `waitForInclusion` retourne `included`. */
function setupClient() {
  const waitForInclusion = vi.fn(async () => ({ status: "included" as const }));
  useSdkStore.setState({
    endpoint: "http://test",
    customEndpoint: null,
    client: { waitForInclusion } as unknown as SangoClient,
  });
  return { waitForInclusion };
}

beforeEach(() => {
  vi.clearAllMocks();
  useWalletStore.setState({
    format: "sango-legacy",
    wallet: fakeWallet,
    status: "unlocked",
    activeId: ADDRESS_HEX,
    network: "testnet",
  });
});

// --- Tests par kind --------------------------------------------------------

describe("use-staking-actions (session-backed)", () => {
  it("useBond sends { kind: 'bond', assetRef, amount }", async () => {
    const { session, send } = makeSession();
    const { waitForInclusion } = setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useBond(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ amountBaseUnits: 1_000_000n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      {
        kind: "bond",
        assetRef: {
          kind: "native",
          assetId: "sango",
          networkId: "sango-devnet",
        },
        amount: 1_000_000n,
      },
      { family: "sango", accountIndex: 0, networkId: "sango-devnet" },
    );
    expect(waitForInclusion).toHaveBeenCalledWith(TX_HASH);
  });

  it("useUnbond sends { kind: 'unbond', ... }", async () => {
    const { session, send } = makeSession();
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useUnbond(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ amountBaseUnits: 5_000n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "unbond", amount: 5_000n }),
      expect.anything(),
    );
  });

  it("useDelegate sends { kind: 'delegate', validator, amount }", async () => {
    const { session, send } = makeSession();
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useDelegate(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ validator: VALIDATOR, amountBaseUnits: 42n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "delegate",
        validator: VALIDATOR,
        amount: 42n,
      }),
      expect.anything(),
    );
  });

  it("useUndelegate sends { kind: 'undelegate', validator, amount }", async () => {
    const { session, send } = makeSession();
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useUndelegate(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ validator: VALIDATOR, amountBaseUnits: 100n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "undelegate",
        validator: VALIDATOR,
        amount: 100n,
      }),
      expect.anything(),
    );
  });

  it("useClaimRewards sends { kind: 'claimRewards', validator }", async () => {
    const { session, send } = makeSession();
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useClaimRewards(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ validator: VALIDATOR });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "claimRewards", validator: VALIDATOR }),
      expect.anything(),
    );
  });

  it("useRegisterValidator sends { kind: 'registerValidator', commissionBps, selfStake }", async () => {
    const { session, send } = makeSession();
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useRegisterValidator(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ commissionBps: 700, selfStakeBaseUnits: 1_000_000_000_000n });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "registerValidator",
        commissionBps: 700,
        selfStake: 1_000_000_000_000n,
      }),
      expect.anything(),
    );
  });

  it("useUpdateCommission sends { kind: 'updateCommission', newCommissionBps }", async () => {
    const { session, send } = makeSession();
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useUpdateCommission(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ newCommissionBps: 500 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "updateCommission",
        newCommissionBps: 500,
      }),
      expect.anything(),
    );
  });

  it("useUnjail sends { kind: 'unjail' }", async () => {
    const { session, send } = makeSession();
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useUnjail(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "unjail" }),
      expect.anything(),
    );
  });
});

// --- Erreurs ---------------------------------------------------------------

describe("use-staking-actions — erreurs", () => {
  it("throws when session is null", async () => {
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useBond(), {
      wrapper: makeWrapper(null, qc),
    });
    result.current.mutate({ amountBaseUnits: 1n });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/WalletSession/);
  });

  it("propagates session.send() errors", async () => {
    const send = vi.fn(async () => {
      throw new Error("Insufficient balance");
    });
    const session = { send } as unknown as WalletSession;
    setupClient();
    const qc = makeQc();

    const { result } = renderHook(() => useDelegate(), {
      wrapper: makeWrapper(session, qc),
    });
    result.current.mutate({ validator: VALIDATOR, amountBaseUnits: 1n });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/Insufficient balance/);
  });
});
