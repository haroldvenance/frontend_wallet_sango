import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHookWithQuery } from "@/test-utils";

// Mock du sdk-store AVANT d'importer le hook.
const mockGetValidators = vi.fn();

vi.mock("@/stores/sdk-store", () => ({
  useSdkStore: () => ({
    client: {
      getValidators: mockGetValidators,
      getValidatorInfo: vi.fn(),
    },
    endpoint: "http://test",
  }),
}));

import { useValidators } from "./use-validators";

const SAMPLE = [
  {
    address: "0x" + "aa".repeat(20),
    publicKey: "0x" + "bb".repeat(32),
    selfStake: "1000000000000",
    totalDelegated: "0",
    votingPower: "1000000000000",
    commissionBps: 700,
    jailed: false,
    pendingCommissionBps: null,
    pendingCommissionAt: null,
    jailedUntil: null,
    downtimeWindowStart: 0,
    downtimeMissed: 0,
  },
];

describe("useValidators", () => {
  beforeEach(() => {
    mockGetValidators.mockReset();
  });

  it("retourne la liste des validateurs", async () => {
    mockGetValidators.mockResolvedValueOnce(SAMPLE);
    const { result } = renderHookWithQuery(() => useValidators());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE);
    expect(mockGetValidators).toHaveBeenCalledOnce();
  });

  it("expose l'erreur si le RPC échoue", async () => {
    mockGetValidators.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHookWithQuery(() => useValidators());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
  });
});
