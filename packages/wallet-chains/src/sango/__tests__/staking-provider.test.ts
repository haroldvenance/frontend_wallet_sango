import { describe, expect, it, vi } from "vitest";
import { SangoStakingProvider } from "../staking-provider";
import { mockRpc } from "./_helpers";

const ADDR = "0x" + "aa".repeat(20);
const VALIDATOR = "0x" + "bb".repeat(20);

const FIXTURE_VALIDATOR = {
  address: VALIDATOR,
  publicKey: "0x" + "cc".repeat(32),
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

const FIXTURE_DELEGATION = {
  delegator: ADDR,
  validator: VALIDATOR,
  bonded: "1000000000",
  unbonding: "0",
  unbondingUntil: null,
  pendingRewards: "5000",
};

const FIXTURE_UNBONDING = {
  id: 1,
  delegator: ADDR,
  validator: VALIDATOR,
  amount: "1000000000",
  matureAt: 1700000000,
};

describe("SangoStakingProvider", () => {
  it("listValidators forwards to rpc.getValidators", async () => {
    const getValidators = vi.fn(async () => [FIXTURE_VALIDATOR]);
    const p = new SangoStakingProvider(mockRpc({ getValidators }));
    const got = await p.listValidators();
    expect(got).toHaveLength(1);
    expect(got[0]!.address).toBe(VALIDATOR);
    expect(got[0]!.commissionBps).toBe(700);
  });

  it("getValidatorInfo forwards the address", async () => {
    const getValidatorInfo = vi.fn(async () => FIXTURE_VALIDATOR);
    const p = new SangoStakingProvider(mockRpc({ getValidatorInfo }));
    const got = await p.getValidatorInfo(VALIDATOR);
    expect(getValidatorInfo).toHaveBeenCalledWith(VALIDATOR);
    expect(got!.address).toBe(VALIDATOR);
  });

  it("getValidatorInfo returns null for unknown", async () => {
    const p = new SangoStakingProvider(mockRpc());
    expect(await p.getValidatorInfo(VALIDATOR)).toBeNull();
  });

  it("getDelegations forwards the delegator address", async () => {
    const getDelegations = vi.fn(async () => [FIXTURE_DELEGATION]);
    const p = new SangoStakingProvider(mockRpc({ getDelegations }));
    const got = await p.getDelegations(ADDR);
    expect(getDelegations).toHaveBeenCalledWith(ADDR);
    expect(got[0]!.validator).toBe(VALIDATOR);
    expect(got[0]!.pendingRewards).toBe("5000");
  });

  it("getPendingUnbondings forwards the delegator address", async () => {
    const getPendingUnbondings = vi.fn(async () => [FIXTURE_UNBONDING]);
    const p = new SangoStakingProvider(mockRpc({ getPendingUnbondings }));
    const got = await p.getPendingUnbondings(ADDR);
    expect(getPendingUnbondings).toHaveBeenCalledWith(ADDR);
    expect(got[0]!.id).toBe(1);
    expect(got[0]!.matureAt).toBe(1_700_000_000);
  });

  it("propagates RPC errors", async () => {
    const getValidators = vi.fn(async () => {
      throw new Error("RPC down");
    });
    const p = new SangoStakingProvider(mockRpc({ getValidators }));
    await expect(p.listValidators()).rejects.toThrow("RPC down");
  });
});
