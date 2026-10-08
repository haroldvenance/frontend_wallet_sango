import { describe, expect, it, vi } from "vitest";

import type { SignedTransaction } from "../../types/tx";
import { BitcoinBroadcaster } from "../broadcaster";
import type { BitcoinChangeAddressProvider } from "../change-address-provider";
import type { BitcoinRpc } from "../rpc";
import type { BitcoinUnsignedPayload } from "../transaction-builder";

const RAW_BYTES = new Uint8Array([0x02, 0x00, 0x00, 0x00]);
const RAW_HEX = "02000000";
const TX_HASH = "a".repeat(64);

function makeRpc(
  broadcastTx: ReturnType<typeof vi.fn> = vi.fn(async () => TX_HASH),
): BitcoinRpc {
  return {
    getUtxos: vi.fn(async () => []),
    getTxs: async () => [],
    getFeeRates: vi.fn(async () => ({ fast: 1n, normal: 1n, slow: 1n })),
    broadcastTx,
  } as unknown as BitcoinRpc;
}

function makeChangeProvider(): {
  provider: BitcoinChangeAddressProvider;
  commit: ReturnType<typeof vi.fn>;
} {
  const commit = vi.fn();
  return {
    provider: {
      getChangeAddress: vi.fn(),
      commit,
      currentIndex: () => 0,
    },
    commit,
  };
}

function makeSigned(
  payload: Partial<BitcoinUnsignedPayload> = {},
): SignedTransaction {
  const basePayload: BitcoinUnsignedPayload = {
    tx: {} as BitcoinUnsignedPayload["tx"], // non utilisé par le broadcaster
    changeAddress: null,
    fee: 0n,
    feeRate: 1n,
    spentUtxos: [],
  };
  return {
    unsigned: {
      family: "bitcoin",
      networkId: "bitcoin-testnet",
      payload: { ...basePayload, ...payload },
      meta: {
        from: "tb1qsender" as never,
        to: "tb1qrecipient" as never,
        assetRef: {
          kind: "native",
          assetId: "btc",
          networkId: "bitcoin-testnet",
        },
        amount: 1n,
      },
    },
    raw: RAW_BYTES,
    txHash: "0x" + TX_HASH,
  };
}

describe("BitcoinBroadcaster — happy path", () => {
  it("forward raw hex (sans 0x) au RPC", async () => {
    const broadcastTx = vi.fn(async () => TX_HASH);
    const { provider } = makeChangeProvider();
    const b = new BitcoinBroadcaster(makeRpc(broadcastTx), provider);

    const hash = await b.broadcast(makeSigned());
    expect(broadcastTx).toHaveBeenCalledWith(RAW_HEX);
    expect(hash).toBe(TX_HASH);
  });

  it("pas de commit si changeAddress = null", async () => {
    const { provider, commit } = makeChangeProvider();
    const b = new BitcoinBroadcaster(makeRpc(), provider);

    await b.broadcast(makeSigned({ changeAddress: null }));
    expect(commit).not.toHaveBeenCalled();
  });

  it("commit appelé avec changeAddress.derivationIndex si présent", async () => {
    const { provider, commit } = makeChangeProvider();
    const b = new BitcoinBroadcaster(makeRpc(), provider);

    await b.broadcast(
      makeSigned({
        changeAddress: {
          address: "tb1qchange",
          script: new Uint8Array(22),
          derivationIndex: 5,
        },
      }),
    );
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(5);
  });

  it("pas de commit si broadcastTx throw", async () => {
    const broadcastTx = vi.fn(async () => {
      throw new Error("HTTP 400 — bad-txns");
    });
    const { provider, commit } = makeChangeProvider();
    const b = new BitcoinBroadcaster(makeRpc(broadcastTx), provider);

    await expect(
      b.broadcast(
        makeSigned({
          changeAddress: {
            address: "tb1qchange",
            script: new Uint8Array(22),
            derivationIndex: 3,
          },
        }),
      ),
    ).rejects.toThrow(/HTTP 400/);
    expect(commit).not.toHaveBeenCalled();
  });

  it("propagation de l'erreur commit (validation index)", async () => {
    const commit = vi.fn(() => {
      throw new Error("index mismatch");
    });
    const provider: BitcoinChangeAddressProvider = {
      getChangeAddress: vi.fn(),
      commit,
      currentIndex: () => 0,
    };
    const b = new BitcoinBroadcaster(makeRpc(), provider);

    // La tx est broadcastée mais commit throw — l'erreur remonte.
    await expect(
      b.broadcast(
        makeSigned({
          changeAddress: {
            address: "tb1qchange",
            script: new Uint8Array(22),
            derivationIndex: 999,
          },
        }),
      ),
    ).rejects.toThrow(/index mismatch/);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("pas de commit sur family ≠ bitcoin", async () => {
    const { provider, commit } = makeChangeProvider();
    const b = new BitcoinBroadcaster(makeRpc(), provider);

    const evmSigned: SignedTransaction = {
      ...makeSigned({
        changeAddress: {
          address: "tb1qchange",
          script: new Uint8Array(22),
          derivationIndex: 1,
        },
      }),
      unsigned: {
        ...makeSigned().unsigned,
        family: "evm",
      },
    };

    await b.broadcast(evmSigned);
    expect(commit).not.toHaveBeenCalled();
  });
});
