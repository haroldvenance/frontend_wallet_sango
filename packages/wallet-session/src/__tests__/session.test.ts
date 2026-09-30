import { describe, expect, it, vi } from "vitest";
import type {
  AccountRef,
  AssetRef,
  ChainAdapter,
  ChainRegistry,
  Network,
  Signer,
} from "@sango/wallet-chains";
import { createWalletSession } from "../session";
import { InMemoryAssetList, SANGO_NATIVE_ASSET } from "../assets";
import { KeyringBackedAccountList } from "../accounts";
import { FakeKeyring } from "./_helpers";

// --- Fixtures --------------------------------------------------------------

const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

const NATIVE: AssetRef = {
  kind: "native",
  assetId: "sango",
  networkId: "sango-devnet",
};

const ADDRESS = "0x" + "aa".repeat(20);

const NETWORK: Network = {
  id: "sango-devnet",
  family: "sango",
  name: "Sango Devnet",
  chainId: "0x" + "11".repeat(32),
  nativeAsset: "sango",
  defaultRpcEndpoints: ["http://127.0.0.1:8545"],
  explorer: {
    baseUrl: "http://127.0.0.1:8090",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

function fakeSigner(): Signer {
  return {
    getPublicKey: vi.fn(async () => new Uint8Array(32).fill(0x01)),
    signDomain: vi.fn(async () => new Uint8Array(64).fill(0xff)),
  };
}

interface AdapterOverrides {
  deriveAddress?: (a: AccountRef) => Promise<string>;
  getBalance?: (...args: unknown[]) => Promise<unknown>;
  getHistory?: (...args: unknown[]) => Promise<unknown>;
  estimate?: (...args: unknown[]) => Promise<unknown>;
  build?: (...args: unknown[]) => Promise<unknown>;
  sign?: (...args: unknown[]) => Promise<unknown>;
  broadcast?: (...args: unknown[]) => Promise<unknown>;
}

function makeAdapter(o: AdapterOverrides = {}): ChainAdapter {
  return {
    network: NETWORK,
    addressProvider: {
      deriveAddress: o.deriveAddress ?? (async () => ADDRESS),
      validateAddress: () => true,
    },
    balanceProvider: {
      getBalance:
        (o.getBalance as never) ??
        (async () => ({
          assetId: "sango",
          networkId: "sango-devnet",
          amount: 123n,
          decimals: 7,
        })),
    },
    historyProvider: {
      getHistory:
        (o.getHistory as never) ?? (async () => ({ total: 0, items: [] })),
    },
    transactionBuilder: {
      build:
        (o.build as never) ??
        (async (params: unknown, _sender: unknown) => ({
          family: "sango" as const,
          networkId: "sango-devnet",
          payload: params,
          meta: {
            from: ADDRESS,
            to: ADDRESS,
            assetRef: NATIVE,
            amount: 1n,
          },
        })),
    },
    transactionSigner: {
      sign:
        (o.sign as never) ??
        (async (unsigned: unknown) => ({
          unsigned,
          raw: new Uint8Array([1, 2, 3]),
          txHash: "0x" + "ee".repeat(32),
        })),
    },
    broadcaster: {
      broadcast: (o.broadcast as never) ?? (async () => "0x" + "ee".repeat(32)),
    },
    feeEstimator: {
      estimate:
        (o.estimate as never) ??
        (async () => ({ assetId: "sango", total: 4_200_000n })),
    },
  };
}

function fakeRegistry(adapter?: ChainAdapter): ChainRegistry {
  const byId = new Map<string, ChainAdapter>();
  if (adapter) byId.set(adapter.network.id, adapter);
  return {
    register: () => {
      throw new Error("not used in tests");
    },
    get: (id: string) => byId.get(id),
    list: () => (adapter ? [adapter.network] : []),
    listByFamily: () => (adapter ? [adapter.network] : []),
    unregister: () => byId.delete(adapter!.network.id),
  };
}

function makeSession(adapter?: ChainAdapter) {
  const assets = new InMemoryAssetList();
  assets.register(SANGO_NATIVE_ASSET);
  return createWalletSession({
    chainRegistry: fakeRegistry(adapter),
    signer: fakeSigner(),
    accounts: new KeyringBackedAccountList(new FakeKeyring()),
    assets,
  });
}

// --- Tests -----------------------------------------------------------------

describe("WalletSession", () => {
  it("getBalance() delegates to adapter.balanceProvider", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.balanceProvider, "getBalance");
    const session = makeSession(adapter);
    const bal = await session.getBalance(ACCOUNT, NATIVE);
    expect(bal.amount).toBe(123n);
    expect(spy).toHaveBeenCalledWith(ADDRESS, NATIVE);
  });

  it("getHistory() defaults limit to 20", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.historyProvider, "getHistory");
    const session = makeSession(adapter);
    await session.getHistory(ACCOUNT, NATIVE);
    expect(spy).toHaveBeenCalledWith({
      address: ADDRESS,
      assetRef: NATIVE,
      limit: 20,
    });
  });

  it("estimateFee() overrides `from` with derived address", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.feeEstimator!, "estimate");
    const session = makeSession(adapter);
    const est = await session.estimateFee(
      { from: "0xWRONG", to: ADDRESS, assetRef: NATIVE, amount: 1n },
      ACCOUNT,
    );
    expect(est.total).toBe(4_200_000n);
    expect(spy).toHaveBeenCalledWith({
      from: ADDRESS,
      to: ADDRESS,
      assetRef: NATIVE,
      amount: 1n,
    });
  });

  it("send() runs build → sign → broadcast in order", async () => {
    const calls: string[] = [];
    const adapter = makeAdapter({
      build: async (p: unknown, _sender: unknown) => {
        calls.push("build");
        return {
          family: "sango" as const,
          networkId: "sango-devnet",
          payload: p,
          meta: { from: ADDRESS, to: ADDRESS, assetRef: NATIVE, amount: 1n },
        };
      },
      sign: async (u: unknown) => {
        calls.push("sign");
        return {
          unsigned: u as never,
          raw: new Uint8Array([1]),
          txHash: "0x" + "ee".repeat(32),
        };
      },
      broadcast: async () => {
        calls.push("broadcast");
        return "0x" + "ee".repeat(32);
      },
    });
    const session = makeSession(adapter);
    const hash = await session.send(
      { kind: "transfer", to: ADDRESS, assetRef: NATIVE, amount: 1n },
      ACCOUNT,
    );
    expect(hash).toBe("0x" + "ee".repeat(32));
    expect(calls).toEqual(["build", "sign", "broadcast"]);
  });

  it("send() passes the derived sender as 2nd arg to build()", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.transactionBuilder!, "build");
    const session = makeSession(adapter);
    await session.send(
      { kind: "transfer", to: ADDRESS, assetRef: NATIVE, amount: 1n },
      ACCOUNT,
    );
    expect(spy).toHaveBeenCalledWith(
      { kind: "transfer", to: ADDRESS, assetRef: NATIVE, amount: 1n },
      ADDRESS,
    );
  });

  it("explorerLink() formats the URL from network.explorer", () => {
    const session = makeSession(makeAdapter());
    const url = session.explorerLink(ACCOUNT, "0x" + "ee".repeat(32));
    expect(url).toBe(`http://127.0.0.1:8090/tx/0x${"ee".repeat(32)}`);
  });

  it("explorerLink() returns undefined when no explorer config", () => {
    const adapter = makeAdapter();
    const noExplorer: ChainAdapter = {
      ...adapter,
      network: { ...NETWORK, explorer: undefined },
    };
    const session = makeSession(noExplorer);
    expect(session.explorerLink(ACCOUNT, "0xdead")).toBeUndefined();
  });

  it("throws when no adapter is registered for the network", async () => {
    const session = makeSession(undefined);
    await expect(session.getBalance(ACCOUNT, NATIVE)).rejects.toThrow(
      /no chain adapter/,
    );
  });

  it("throws on network mismatch between account and assetRef", async () => {
    const session = makeSession(makeAdapter());
    await expect(
      session.getBalance(
        { ...ACCOUNT, networkId: "sango-testnet" },
        NATIVE,
      ),
    ).rejects.toThrow(/does not match/);
  });

  it("throws when adapter has no feeEstimator", async () => {
    const adapter = makeAdapter();
    const noFee: ChainAdapter = { ...adapter, feeEstimator: undefined };
    const session = makeSession(noFee);
    await expect(
      session.estimateFee(
        { from: "0x0", to: ADDRESS, assetRef: NATIVE, amount: 1n },
        ACCOUNT,
      ),
    ).rejects.toThrow(/no fee estimator/);
  });

  it("exposes accounts, assets, chainRegistry, signer", () => {
    const session = makeSession(makeAdapter());
    expect(session.accounts).toBeDefined();
    expect(session.assets).toBeDefined();
    expect(session.chainRegistry).toBeDefined();
    expect(session.signer).toBeDefined();
  });
});
