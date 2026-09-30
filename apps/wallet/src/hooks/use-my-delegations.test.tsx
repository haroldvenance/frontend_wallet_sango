import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AddressHex } from "@sango/types";
import type { Delegation, PendingUnbonding } from "@sango/wallet-chains";
import type { Wallet } from "@sango/wallet-core";
import type { WalletSession } from "@sango/wallet-session";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useMyDelegations, useMyPendingUnbondings } from "./use-my-delegations";

const ADDRESS_HEX = "0x" + "aa".repeat(20);
const VALIDATOR = ("0x" + "dd".repeat(20)) as AddressHex;

const fakeWallet = {
  identity: {
    addressHex: ADDRESS_HEX,
    publicKey: new Uint8Array(32).fill(0xcc),
    address: new Uint8Array(20).fill(0xaa),
    addressBech32: "tsango1fake",
    network: "testnet",
  },
} as unknown as Wallet;

const DELEGATION: Delegation = {
  delegator: ADDRESS_HEX,
  validator: VALIDATOR,
  bonded: "1000000000",
  unbonding: "0",
  unbondingUntil: null,
  pendingRewards: "5000",
};

const PENDING: PendingUnbonding = {
  id: 1,
  delegator: ADDRESS_HEX,
  validator: VALIDATOR,
  amount: "1000000000",
  matureAt: 1_700_000_000,
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
    wallet: fakeWallet,
    status: "unlocked",
    activeId: ADDRESS_HEX,
    network: "testnet",
  });
});

describe("useMyDelegations (session-backed)", () => {
  it("delegates to session.getDelegations(account)", async () => {
    const getDelegations = vi.fn(async () => [DELEGATION]);
    const session = { getDelegations } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useMyDelegations(), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([DELEGATION]);
    expect(getDelegations).toHaveBeenCalledWith({
      family: "sango",
      accountIndex: 0,
      networkId: "sango-devnet",
    });

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual([
      "my-delegations",
      "http://test",
      "sango-devnet",
      ADDRESS_HEX,
    ]);
  });

  it("returns [] when session is null", async () => {
    const qc = makeQc();
    const { result } = renderHook(() => useMyDelegations(), {
      wrapper: makeWrapper(null, qc),
    });
    // enabled = false quand session null (status unlocked mais pas de session)
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useMyPendingUnbondings (session-backed)", () => {
  it("delegates to session.getPendingUnbondings(account)", async () => {
    const getPendingUnbondings = vi.fn(async () => [PENDING]);
    const session = { getPendingUnbondings } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useMyPendingUnbondings(), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([PENDING]);
    expect(getPendingUnbondings).toHaveBeenCalledWith({
      family: "sango",
      accountIndex: 0,
      networkId: "sango-devnet",
    });
  });
});
