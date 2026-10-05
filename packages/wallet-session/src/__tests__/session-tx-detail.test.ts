import { describe, expect, it, vi } from "vitest";
import type {
  AccountRef,
  ChainAdapter,
  ChainRegistry,
  Network,
  Signer,
  TxDetail,
  TxDetailPage,
} from "@sango/wallet-chains";
import { createWalletSession } from "../session";
import { InMemoryAssetList, SANGO_NATIVE_ASSET } from "../assets";
import { InMemoryAccountList } from "../accounts";
import { asAddress, asHash, asPublicKey } from "@sango/wallet-chains";

const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

const ADDRESS = asAddress("aa".repeat(20));
const HASH = asHash("ee".repeat(32));

const NETWORK: Network = {
  id: "sango-devnet",
  family: "sango",
  name: "Sango Devnet",
  chainId: asHash("11".repeat(32)),
  nativeAsset: "sango",
  isTestnet: true,
  defaultRpcEndpoints: ["http://127.0.0.1:8545"],
};

const FIXTURE_TX: TxDetail = {
  hash: HASH,
  kind: "native",
  blockHeight: 42,
  blockHash: asHash("dd".repeat(32)),
  txIndex: 0,
  version: 1,
  chainId: asHash("11".repeat(32)),
  nonce: 7,
  sender: ADDRESS,
  publicKey: asPublicKey("cc".repeat(32)),
  gasLimit: 21_000,
  maxFee: "20",
  priorityFee: "2",
  value: "100",
  txKind: 0x01,
  recipient: asAddress("bb".repeat(20)),
  data: asHash(""),
  signature: asHash("ee".repeat(64)),
  success: true,
  gasUsed: 21_000,
};

const FIXTURE_PAGE: TxDetailPage = {
  total: 1,
  offset: 0,
  limit: 20,
  items: [FIXTURE_TX],
};

function fakeSigner(): Signer {
  return {
    getPublicKey: vi.fn(async () => new Uint8Array(32).fill(0x01)),
    signDomain: vi.fn(async () => new Uint8Array(64).fill(0xff)),
  };
}

function makeAdapter(opts: { withTxDetail?: boolean } = {}): ChainAdapter {
  const withTxDetail = opts.withTxDetail ?? true;
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
    txDetailProvider: withTxDetail
      ? {
          getTransactionByHash: vi.fn(async () => FIXTURE_TX),
          getTransactionsByAddress: vi.fn(async () => FIXTURE_PAGE),
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

describe("WalletSession — tx detail (D-SESS-9)", () => {
  it("getTransactionByHash(networkId, hash) delegates to provider", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.txDetailProvider!, "getTransactionByHash");
    const session = makeSession(adapter);

    const tx = await session.getTransactionByHash("sango-devnet", HASH);
    expect(tx).not.toBeNull();
    expect(tx!.hash).toBe(HASH);
    expect(tx!.txKind).toBe(0x01);
    expect(spy).toHaveBeenCalledWith(HASH);
  });

  it("getTransactionPage(account, limit, offset) derives address", async () => {
    const adapter = makeAdapter();
    const spy = vi.spyOn(adapter.txDetailProvider!, "getTransactionsByAddress");
    const session = makeSession(adapter);

    const page = await session.getTransactionPage(ACCOUNT, 20, 0);
    expect(page.total).toBe(1);
    expect(page.items[0]!.hash).toBe(HASH);
    expect(spy).toHaveBeenCalledWith(ADDRESS, 20, 0);
  });

  it("throws when adapter has no txDetailProvider", async () => {
    const session = makeSession(makeAdapter({ withTxDetail: false }));
    await expect(
      session.getTransactionByHash("sango-devnet", HASH),
    ).rejects.toThrow(/no tx detail provider/);
    await expect(
      session.getTransactionPage(ACCOUNT, 20, 0),
    ).rejects.toThrow(/no tx detail provider/);
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
    await expect(
      session.getTransactionByHash("sango-devnet", HASH),
    ).rejects.toThrow(/no chain adapter/);
  });
});
