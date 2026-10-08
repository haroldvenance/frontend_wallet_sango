import { asPublicKey } from "@sango/wallet-chains";
import { asAddress } from "@sango/wallet-chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountState } from "@sango/wallet-chains";
import type { Wallet } from "@sango/wallet-core";
import type { WalletSession } from "@sango/wallet-session";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useAccount } from "./use-account";

const ADDRESS_HEX = asAddress("aa".repeat(20));
const PUBKEY_HEX = asPublicKey("cc".repeat(32));

const fakeWallet = {
  identity: {
    addressHex: ADDRESS_HEX,
    publicKey: new Uint8Array(32).fill(0xcc),
    address: new Uint8Array(20).fill(0xaa),
    addressBech32: "tsango1fake",
    network: "testnet",
  },
} as unknown as Wallet;

function makeSession(
  getAccount: (account: unknown) => Promise<AccountState | null>,
): WalletSession {
  return { getAccount } as unknown as WalletSession;
}

function makeWrapper(session: WalletSession | null) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
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

beforeEach(() => {
  useSdkStore.setState({
    endpoint: "http://test",
    network: "testnet",
    customEndpoint: null,
  });
  useWalletStore.setState({
    format: "sango-legacy",
    wallet: fakeWallet,
    status: "unlocked",
    activeId: ADDRESS_HEX,
    network: "testnet",
  });
});

describe("useAccount (session-backed)", () => {
  it("maps AccountState → Account (balance bigint → string)", async () => {
    const getAccount = vi.fn(async () => ({
      address: ADDRESS_HEX,
      publicKey: PUBKEY_HEX,
      balance: 1000n,
      nonce: 5,
    }));
    const { result } = renderHook(() => useAccount(), {
      wrapper: makeWrapper(makeSession(getAccount)),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      address: ADDRESS_HEX,
      publicKey: PUBKEY_HEX,
      balance: "1000",
      nonce: 5,
    });
    expect(getAccount).toHaveBeenCalledWith({
      family: "sango",
      accountIndex: 0,
      networkId: "sango-devnet",
    });
  });

  it("returns null for a ghost account (session.getAccount → null)", async () => {
    const session = makeSession(vi.fn(async () => null));
    const { result } = renderHook(() => useAccount(), {
      wrapper: makeWrapper(session),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(null);
  });

  it("does not fetch when the wallet is locked", () => {
    useWalletStore.setState({ status: "locked" });
    const getAccount = vi.fn();
    const session = makeSession(
      getAccount as unknown as (a: unknown) => Promise<AccountState | null>,
    );
    const { result } = renderHook(() => useAccount(), {
      wrapper: makeWrapper(session),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getAccount).not.toHaveBeenCalled();
  });

  it("does not fetch when no session is provided", () => {
    const { result } = renderHook(() => useAccount(), {
      wrapper: makeWrapper(null),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });
});
