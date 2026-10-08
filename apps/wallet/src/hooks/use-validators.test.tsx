import { asPublicKey } from "@sango/wallet-chains";
import { asAddress } from "@sango/wallet-chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AddressHex } from "@sango/types";
import type { ValidatorInfo } from "@sango/rpc";
import type { WalletSession } from "@sango/wallet-session";

import { WalletSessionContext } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useValidatorInfo, useValidators } from "./use-validators";

const VALIDATOR = (asAddress("dd".repeat(20))) as AddressHex;

const FIXTURE_VALIDATOR: ValidatorInfo = {
  address: VALIDATOR,
  // Caster car `@sango/rpc.PublicKeyHex` est `\`0x${string}\`` et
  // l'expression ci-dessous produit `string`. Le runtime est identique.
  publicKey: (asPublicKey("cc".repeat(32))) as ValidatorInfo["publicKey"],
  selfStake: "1000000000000",
  totalDelegated: "5000000000000",
  votingPower: "6000000000000",
  commissionBps: 700,
  jailed: false,
  pendingCommissionBps: null,
  pendingCommissionAt: null,
  jailedUntil: null,
  downtimeWindowStart: 100,
  downtimeMissed: 0,
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
  useWalletStore.setState({ network: "testnet", format: "sango-legacy" });
});

describe("useValidators (session-backed)", () => {
  it("delegates to session.listValidators(networkId)", async () => {
    const listValidators = vi.fn(async () => [FIXTURE_VALIDATOR]);
    const session = { listValidators } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useValidators(), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([FIXTURE_VALIDATOR]);
    expect(listValidators).toHaveBeenCalledWith("sango-devnet");

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual([
      "validators",
      "http://test",
      "sango-devnet",
    ]);
  });
});

describe("useValidatorInfo (session-backed)", () => {
  it("delegates to session.getValidatorInfo(networkId, address)", async () => {
    const getValidatorInfo = vi.fn(async () => FIXTURE_VALIDATOR);
    const session = { getValidatorInfo } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useValidatorInfo(VALIDATOR), {
      wrapper: makeWrapper(session, qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(FIXTURE_VALIDATOR);
    expect(getValidatorInfo).toHaveBeenCalledWith("sango-devnet", VALIDATOR);
  });

  it("stays idle when address is undefined", () => {
    const getValidatorInfo = vi.fn();
    const session = { getValidatorInfo } as unknown as WalletSession;
    const qc = makeQc();

    const { result } = renderHook(() => useValidatorInfo(undefined), {
      wrapper: makeWrapper(session, qc),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getValidatorInfo).not.toHaveBeenCalled();
  });
});
