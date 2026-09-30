import { describe, expect, it, vi } from "vitest";
import type {
  AccountRef,
  ChainAdapter,
  ChainRegistry,
  Delegation,
  Network,
  PendingUnbonding,
  Signer,
  ValidatorInfo,
} from "@sango/wallet-chains";
import { createWalletSession } from "../session";
import { InMemoryAssetList, SANGO_NATIVE_ASSET } from "../assets";
import { InMemoryAccountList } from "../accounts";

const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

const ADDRESS = "0x" + "aa".repeat(20);
const VALIDATOR = "0x" + "bb".repeat(20);

const NETWORK: Network = {
  id: "sango-devnet",
  family: "sango",
  name: "Sango Devnet",
  chainId: "0x" + "11".repeat(32),
  nativeAsset: "sango",
  defaultRpcEndpoints: ["http://127.0.0.1:8545"],
};

const DELEGATION: Delegation = {
  delegator: ADDRESS,
  validator: VALIDATOR,
  bonded: "1000000000",
  unbonding: "0",
  unbondingUntil: null,
  pendingRewards: "5000",
};

const PENDING: PendingUnbonding = {
  id: 1,
  delegator: ADDRESS,
  validator: VALIDATOR,
  amount: "1000000000",
  matureAt: 1_700_000_000,
};

const VALIDATOR_INFO: ValidatorInfo = {
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

function fakeSigner(): Signer {
  return {
    getPublicKey: vi.fn(async () => new Uint8Array(32).fill(0x01)),
    signDomain: vi.fn(async () => new Uint8Array(64).fill(0xff)),
  };
}

function makeAdapter(opts: { withStaking?: boolean } = {}): ChainAdapter {
  const withStaking = opts.withStaking ?? true;
  return {
    network: NETWORK,
    addressProvider: {
      deriveAddress: async () => ADDRESS,
      validateAddress: () => true,
    },
    balanceProvider: {
      getBalance: async () => ({
        assetId: "sango",
        networkId: "sango-devnet",
        amount: 0n,
        decimals: 7,
      }),
    },
    historyProvider: {
      getHistory: async () => ({ total: 0, items: [] }),
    },
    stakingProvider: withStaking
      ? {
          listValidators: vi.fn(async () => [VALIDATOR_INFO]),
          getValidatorInfo: vi.fn(async () => VALIDATOR_INFO),
          getDelegations: vi.fn(async () => [DELEGATION]),
          getPendingUnbondings: vi.fn(async () => [PENDING]),
        }
      : undefined,
  };
}

function makeRegistry(adapter: ChainAdapter): ChainRegistry {
  return {
    register: () => {
      throw new Error("unused");
    },
    get: (id: string) => (id === adapter.network.id ? adapter : undefined),
    list: () => [adapter.network],
    listByFamily: () => [adapter.network],
    unregister: () => {},
  };
}

function makeSession(adapter: ChainAdapter) {
  const assets = new InMemoryAssetList();
  assets.register(SANGO_NATIVE_ASSET);
  return createWalletSession({
    chainRegistry: makeRegistry(adapter),
    signer: fakeSigner(),
    accounts: new InMemoryAccountList(),
    assets,
  });
}

describe("WalletSession — staking lecture", () => {
  it("getDelegations delegates with derived address", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.stakingProvider!, "getDelegations");
    const session = makeSession(adapter);

    const got = await session.getDelegations(ACCOUNT);
    expect(got).toHaveLength(1);
    expect(got[0]!.validator).toBe(VALIDATOR);
    expect(spy).toHaveBeenCalledWith(ADDRESS);
  });

  it("getPendingUnbondings delegates with derived address", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.stakingProvider!, "getPendingUnbondings");
    const session = makeSession(adapter);

    const got = await session.getPendingUnbondings(ACCOUNT);
    expect(got).toHaveLength(1);
    expect(got[0]!.id).toBe(1);
    expect(spy).toHaveBeenCalledWith(ADDRESS);
  });

  it("listValidators takes a networkId (no account)", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.stakingProvider!, "listValidators");
    const session = makeSession(adapter);

    const got = await session.listValidators("sango-devnet");
    expect(got).toHaveLength(1);
    expect(got[0]!.address).toBe(VALIDATOR);
    expect(spy).toHaveBeenCalled();
  });

  it("getValidatorInfo takes (networkId, address)", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.stakingProvider!, "getValidatorInfo");
    const session = makeSession(adapter);

    const got = await session.getValidatorInfo("sango-devnet", VALIDATOR);
    expect(got!.address).toBe(VALIDATOR);
    expect(spy).toHaveBeenCalledWith(VALIDATOR);
  });

  it("throws when adapter has no stakingProvider", async () => {
    const session = makeSession(makeAdapter({ withStaking: false }));
    await expect(session.getDelegations(ACCOUNT)).rejects.toThrow(
      /no staking provider/,
    );
    await expect(
      session.listValidators("sango-devnet"),
    ).rejects.toThrow(/no staking provider/);
  });

  it("throws when no adapter registered for the network", async () => {
    const noopRegistry: ChainRegistry = {
      register: () => {},
      get: () => undefined,
      list: () => [],
      listByFamily: () => [],
      unregister: () => {},
    };
    const assets = new InMemoryAssetList();
    assets.register(SANGO_NATIVE_ASSET);
    const session = createWalletSession({
      chainRegistry: noopRegistry,
      signer: fakeSigner(),
      accounts: new InMemoryAccountList(),
      assets,
    });
    await expect(session.getDelegations(ACCOUNT)).rejects.toThrow(
      /no chain adapter/,
    );
  });
});
