import { describe, expect, it, vi } from "vitest";

import type { Address } from "../../types/address";
import type { AssetRef } from "../../types/asset";
import { BITCOIN_NATIVE_ASSET_ID } from "../constants";
import type { BitcoinChangeAddress } from "../change-address-provider";
import type { BitcoinChangeAddressProvider } from "../change-address-provider";
import { BitcoinTransactionBuilder } from "../transaction-builder";
import type { BitcoinUnsignedPayload } from "../transaction-builder";
import { BitcoinUtxoProvider } from "../utxo-provider";
import { mockBitcoinRpc, utxo } from "./_helpers";

/**
 * Adresse BIP-84 canonique testnet (issue de la mnemonic "abandon…").
 * Réutilisable car la dérivation est déterministe.
 */
const SENDER =
  "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl" as Address;
const RECIPIENT =
  "tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97" as Address;

const NATIVE_BTC: AssetRef = {
  kind: "native",
  assetId: BITCOIN_NATIVE_ASSET_ID,
  networkId: "bitcoin-testnet",
};

function makeChangeProvider(
  address = "tb1q9u62588spffmq4dzjxsr5l297znf3z6j5p2688",
): {
  provider: BitcoinChangeAddressProvider;
  commit: ReturnType<typeof vi.fn>;
  next: ReturnType<typeof vi.fn>;
} {
  const commit = vi.fn();
  const next = vi.fn(async (): Promise<BitcoinChangeAddress> => {
    return {
      address,
      // script trivial pour le test — le builder ne le vérifie pas,
      // il fait confiance au provider. Le signer (b.4) l'utilisera.
      script: new Uint8Array([0x00, 0x14, ...new Uint8Array(20)]),
    };
  });
  return {
    provider: {
      next,
      commit,
      currentIndex: () => 0,
    },
    commit,
    next,
  };
}

function makeBuilder(deps: {
  rpc: Parameters<typeof mockBitcoinRpc>[0];
  changeProvider: BitcoinChangeAddressProvider;
}): BitcoinTransactionBuilder {
  return new BitcoinTransactionBuilder(
    {
      utxoProvider: new BitcoinUtxoProvider(mockBitcoinRpc(deps.rpc)),
      changeAddressProvider: deps.changeProvider,
    },
    "bitcoin-testnet",
    "testnet",
  );
}

describe("BitcoinTransactionBuilder — happy path", () => {
  it("1 UTXO + change → 1 input + 2 outputs", async () => {
    const { provider, commit, next } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo({ value: 100_000n })]) },
      changeProvider: provider,
    });

    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 5n,
      },
      SENDER,
    );

    expect(unsigned.family).toBe("bitcoin");
    expect(unsigned.networkId).toBe("bitcoin-testnet");

    const payload = unsigned.payload as BitcoinUnsignedPayload;
    expect(payload.tx.inputsLength).toBe(1);
    expect(payload.tx.outputsLength).toBe(2);
    expect(payload.hasOwnProperty("changeAddress")).toBe(true);
    expect(payload.changeAddress).not.toBeNull();
    expect(payload.fee).toBe(700n);
    expect(payload.feeRate).toBe(5n);
    expect(payload.spentUtxos).toHaveLength(1);

    expect(next).toHaveBeenCalledTimes(1);
    // Le builder ne commit PAS — c'est le broadcaster (b.5).
    expect(commit).not.toHaveBeenCalled();
  });

  it("sans change → 1 input + 1 output, changeProvider non appelé", async () => {
    const { provider, commit, next } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo({ value: 100_000n })]) },
      changeProvider: provider,
    });

    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 99_800n,
        feeRate: 1n,
      },
      SENDER,
    );

    const payload = unsigned.payload as BitcoinUnsignedPayload;
    expect(payload.tx.inputsLength).toBe(1);
    expect(payload.tx.outputsLength).toBe(1);
    expect(payload.changeAddress).toBeNull();
    expect(payload.fee).toBe(200n);
    expect(next).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("meta contient from/to/amount", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo({ value: 100_000n })]) },
      changeProvider: provider,
    });

    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 5n,
      },
      SENDER,
    );

    expect(unsigned.meta.from).toBe(SENDER);
    expect(unsigned.meta.to).toBe(RECIPIENT);
    expect(unsigned.meta.amount).toBe(50_000n);
    expect(unsigned.meta.assetRef).toEqual(NATIVE_BTC);
  });
});

describe("BitcoinTransactionBuilder — validations", () => {
  it("rejette kind ≠ transferBitcoin", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo()]) },
      changeProvider: provider,
    });

    await expect(
      builder.build(
        {
          kind: "transfer",
          to: SENDER,
          assetRef: NATIVE_BTC,
          amount: 1n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/unsupported kind/);
  });

  it("rejette assetRef non-BTC", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo()]) },
      changeProvider: provider,
    });

    await expect(
      builder.build(
        {
          kind: "transferBitcoin",
          to: RECIPIENT,
          assetRef: {
            kind: "native",
            assetId: "eth",
            networkId: "bitcoin-testnet",
          },
          amount: 1n,
          feeRate: 5n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/unsupported asset/);
  });

  it("rejette un network mismatch", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo()]) },
      changeProvider: provider,
    });

    await expect(
      builder.build(
        {
          kind: "transferBitcoin",
          to: RECIPIENT,
          assetRef: {
            kind: "native",
            assetId: BITCOIN_NATIVE_ASSET_ID,
            networkId: "bitcoin-mainnet",
          },
          amount: 1n,
          feeRate: 5n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/network mismatch/);
  });

  it("rejette amount <= 0", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo()]) },
      changeProvider: provider,
    });

    await expect(
      builder.build(
        {
          kind: "transferBitcoin",
          to: RECIPIENT,
          assetRef: NATIVE_BTC,
          amount: 0n,
          feeRate: 5n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/amount must be > 0/);
  });

  it("rejette feeRate < 1", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo()]) },
      changeProvider: provider,
    });

    await expect(
      builder.build(
        {
          kind: "transferBitcoin",
          to: RECIPIENT,
          assetRef: NATIVE_BTC,
          amount: 1n,
          feeRate: 0n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/feeRate must be/);
  });

  it("rejette une adresse destinataire mainnet sur un builder testnet", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => [utxo()]) },
      changeProvider: provider,
    });

    const mainnetRecipient =
      "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu" as Address;

    await expect(
      builder.build(
        {
          kind: "transferBitcoin",
          to: mainnetRecipient,
          assetRef: NATIVE_BTC,
          amount: 1n,
          feeRate: 5n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/address network/);
  });

  it("rejette un sender sans UTXOs", async () => {
    const { provider } = makeChangeProvider();
    const builder = makeBuilder({
      rpc: { getUtxos: vi.fn(async () => []) },
      changeProvider: provider,
    });

    await expect(
      builder.build(
        {
          kind: "transferBitcoin",
          to: RECIPIENT,
          assetRef: NATIVE_BTC,
          amount: 1n,
          feeRate: 5n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/no spendable UTXOs/);
  });
});
