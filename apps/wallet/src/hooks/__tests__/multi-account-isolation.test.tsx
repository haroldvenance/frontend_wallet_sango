import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountRef, AccountState } from "@sango/wallet-chains";
import type { WalletSession } from "@sango/wallet-session";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * 🔒 Test d'isolation multi-comptes — Phase 2.2
 *
 * Invariant central : `accountIndex` change → nouvelle query key →
 * cache isolé. Compte 0 et Compte 1 ne partagent jamais de données.
 *
 * Le test mocke une `WalletSession.getAccount` qui retourne des
 * données différentes selon l'`accountIndex` de l'`AccountRef` reçu.
 */

const ACCOUNT_0_ADDR = "0x" + "0a".repeat(20);
const ACCOUNT_1_ADDR = "0x" + "1a".repeat(20);

function makeSession(): WalletSession {
  const getAccount = vi.fn(async (account: AccountRef): Promise<AccountState> => {
    return {
      address:
        account.accountIndex === 0
          ? (ACCOUNT_0_ADDR as AccountState["address"])
          : (ACCOUNT_1_ADDR as AccountState["address"]),
      publicKey: null,
      balance: account.accountIndex === 0 ? 1_000_000n : 2_000_000n,
      nonce: account.accountIndex,
    };
  });
  return { getAccount } as unknown as WalletSession;
}

function makeWrapper(session: WalletSession, qc: QueryClient) {
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
      queries: { retry: false, gcTime: 60_000, staleTime: 60_000 },
    },
  });
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
    networkId: "ethereum-sepolia",
    family: "evm",
    activeId: "0xwallet",
    walletAccountIndexes: { "0xwallet": 0 },
  });
});

describe("🔒 isolation multi-comptes — query keys", () => {
  it("Compte 0 et Compte 1 produisent des clés distinctes", async () => {
    const session = makeSession();
    const qc = makeQc();

    // 1. Compte 0 (index 0)
    const { result: r0 } = renderHook(() => useEvmAccount(), {
      wrapper: makeWrapper(session, qc),
    });
    await waitFor(() => expect(r0.current.isSuccess).toBe(true));
    expect(r0.current.data?.balance).toBe(1_000_000n);

    // 2. Switch vers Compte 1 (index 1)
    useWalletStore.setState({
      walletAccountIndexes: { "0xwallet": 1 },
    });

    const { result: r1 } = renderHook(() => useEvmAccount(), {
      wrapper: makeWrapper(session, qc),
    });
    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    expect(r1.current.data?.balance).toBe(2_000_000n);

    // 3. Les deux clés coexistent dans le cache
    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(
      keys.some(
        (k) =>
          k[0] === "evm-account" &&
          k[2] === "ethereum-sepolia" &&
          k[3] === 0,
      ),
    ).toBe(true);
    expect(
      keys.some(
        (k) =>
          k[0] === "evm-account" &&
          k[2] === "ethereum-sepolia" &&
          k[3] === 1,
      ),
    ).toBe(true);
  });

  it("getAccount reçoit le bon accountIndex à chaque switch", async () => {
    const session = makeSession();
    const getAccount = session.getAccount as unknown as ReturnType<
      typeof vi.fn
    >;
    const qc = makeQc();

    renderHook(() => useEvmAccount(), { wrapper: makeWrapper(session, qc) });
    await waitFor(() => expect(getAccount).toHaveBeenCalled());
    expect(getAccount.mock.calls[0]![0].accountIndex).toBe(0);

    useWalletStore.setState({ walletAccountIndexes: { "0xwallet": 1 } });
    renderHook(() => useEvmAccount(), { wrapper: makeWrapper(session, qc) });

    await waitFor(() => {
      const last =
        getAccount.mock.calls[getAccount.mock.calls.length - 1]![0];
      return expect(last.accountIndex).toBe(1);
    });
  });

  it("revenir à Compte 0 réutilise le cache (pas d'appel réseau)", async () => {
    const session = makeSession();
    const getAccount = session.getAccount as unknown as ReturnType<
      typeof vi.fn
    >;
    const qc = makeQc();

    renderHook(() => useEvmAccount(), { wrapper: makeWrapper(session, qc) });
    await waitFor(() => expect(getAccount).toHaveBeenCalledTimes(1));

    useWalletStore.setState({ walletAccountIndexes: { "0xwallet": 1 } });
    renderHook(() => useEvmAccount(), { wrapper: makeWrapper(session, qc) });
    await waitFor(() => expect(getAccount).toHaveBeenCalledTimes(2));

    useWalletStore.setState({ walletAccountIndexes: { "0xwallet": 0 } });
    renderHook(() => useEvmAccount(), { wrapper: makeWrapper(session, qc) });

    // Compte 0 n'a été fetché qu'une seule fois (staleTime 60s)
    const account0Calls = getAccount.mock.calls.filter(
      (call) => (call[0] as AccountRef).accountIndex === 0,
    );
    expect(account0Calls).toHaveLength(1);
  });
});
