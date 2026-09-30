import { asPublicKey } from "@sango/wallet-chains";
import { asAddress } from "@sango/wallet-chains";
import { describe, expect, it, vi } from "vitest";
import type {
  AccountRef,
  AccountState,
  ChainAdapter,
  ChainRegistry,
  Network,
  Signer,
} from "@sango/wallet-chains";
import { createWalletSession } from "../session";
import { InMemoryAssetList, SANGO_NATIVE_ASSET } from "../assets";
import { KeyringBackedAccountList } from "../accounts";
import { FakeKeyring } from "./_helpers";

const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

const ADDRESS = asAddress("aa".repeat(20));

const NETWORK: Network = {
  id: "sango-devnet",
  family: "sango",
  name: "Sango Devnet",
  chainId: asPublicKey("11".repeat(32)),
  nativeAsset: "sango",
  defaultRpcEndpoints: ["http://127.0.0.1:8545"],
};

function fakeSigner(): Signer {
  return {
    getPublicKey: vi.fn(async () => new Uint8Array(32).fill(0x01)),
    signDomain: vi.fn(async () => new Uint8Array(64).fill(0xff)),
  };
}

function makeAdapter(withAccountProvider: boolean): ChainAdapter {
  const state: AccountState = {
    address: ADDRESS,
    publicKey: asPublicKey("cc".repeat(32)),
    balance: 5_000_000_000n,
    nonce: 7,
  };
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
        amount: 5_000_000_000n,
        decimals: 7,
      }),
    },
    historyProvider: {
      getHistory: async () => ({ total: 0, items: [] }),
    },
    accountProvider: withAccountProvider
      ? { getAccount: vi.fn(async () => state) }
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
    accounts: new KeyringBackedAccountList(new FakeKeyring()),
    assets,
  });
}

describe("WalletSession.getAccount", () => {
  it("delegates to adapter.accountProvider with derived address", async () => {
    const adapter = makeAdapter(true);
    const spy = vi.spyOn(adapter.accountProvider!, "getAccount");
    const session = makeSession(adapter);
    const state = await session.getAccount(ACCOUNT);

    expect(state).not.toBeNull();
    expect(state!.balance).toBe(5_000_000_000n);
    expect(state!.nonce).toBe(7);
    expect(spy).toHaveBeenCalledWith(ADDRESS);
  });

  it("returns null when the account does not exist", async () => {
    const adapter = makeAdapter(true);
    (adapter.accountProvider!.getAccount as ReturnType<typeof vi.fn>) = vi.fn(
      async () => null,
    );
    const session = makeSession(adapter);
    expect(await session.getAccount(ACCOUNT)).toBeNull();
  });

  it("throws when the adapter has no accountProvider", async () => {
    const session = makeSession(makeAdapter(false));
    await expect(session.getAccount(ACCOUNT)).rejects.toThrow(
      /no account provider/,
    );
  });

  it("throws when no adapter is registered for the network", async () => {
    const adapter = makeAdapter(true);
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
      accounts: new KeyringBackedAccountList(new FakeKeyring()),
      assets,
    });
    await expect(session.getAccount(ACCOUNT)).rejects.toThrow(
      /no chain adapter/,
    );
    // silence unused warning
    void adapter;
  });
});
