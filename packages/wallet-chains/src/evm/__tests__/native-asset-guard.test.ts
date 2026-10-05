import { describe, expect, it } from "vitest";

import { EvmTransactionBuilder } from "../transaction-builder";
import { ANVIL_ADDRESS_0, mockRpc } from "./_helpers";

/**
 * 🔒 Garde-fous `nativeAsset` — anti-régression E1.7.a
 *
 * Le builder refuse un `assetRef.assetId` qui ne correspond pas au
 * `nativeAsset` du constructeur. Ce test vérifie que :
 *   - "bnb" sur bsc → accepté
 *   - "eth" sur bsc → refusé (le piège exact qu'on veut éviter)
 *   - "eth" sur ethereum-mainnet → accepté (non-régression)
 *   - "bnb" sur ethereum-mainnet → refusé (symétrie)
 */

const TO = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`;
const BSC_CHAIN_ID = 56;
const ETH_CHAIN_ID = 1;

function makeBuilder(networkId: string, chainId: number, nativeAsset: string) {
  return new EvmTransactionBuilder(
    mockRpc({
      getTransactionCount: () => Promise.resolve(0),
      estimateGas: () => Promise.resolve(21_000n),
      getBaseFeePerGas: () => Promise.resolve(1_000_000_000n),
      getMaxPriorityFeePerGas: () => Promise.resolve(1_000_000_000n),
    }),
    networkId,
    chainId,
    nativeAsset,
  );
}

function params(assetId: string, networkId: string) {
  return {
    kind: "transfer" as const,
    to: TO,
    assetRef: { kind: "native" as const, assetId, networkId },
    amount: 1_000_000_000_000_000_000n,
  };
}

describe("🔒 EvmTransactionBuilder — nativeAsset par réseau", () => {
  it("accepte assetId='bnb' sur bsc", async () => {
    const b = makeBuilder("bsc", BSC_CHAIN_ID, "bnb");
    const tx = await b.build(params("bnb", "bsc"), ANVIL_ADDRESS_0);
    expect(tx.meta.assetRef).toEqual({
      kind: "native",
      assetId: "bnb",
      networkId: "bsc",
    });
    const p = tx.payload as Record<string, unknown>;
    expect(p.chainId).toBe(BSC_CHAIN_ID);
  });

  it("refuse assetId='eth' sur bsc (piège E1.7.a)", async () => {
    const b = makeBuilder("bsc", BSC_CHAIN_ID, "bnb");
    await expect(
      b.build(params("eth", "bsc"), ANVIL_ADDRESS_0),
    ).rejects.toThrow(/requires a native assetRef/);
  });

  it("accepte assetId='eth' sur ethereum-mainnet (non-régression)", async () => {
    const b = makeBuilder("ethereum-mainnet", ETH_CHAIN_ID, "eth");
    const tx = await b.build(
      params("eth", "ethereum-mainnet"),
      ANVIL_ADDRESS_0,
    );
    expect(tx.meta.assetRef).toEqual({
      kind: "native",
      assetId: "eth",
      networkId: "ethereum-mainnet",
    });
  });

  it("refuse assetId='bnb' sur ethereum-mainnet (symétrie)", async () => {
    const b = makeBuilder("ethereum-mainnet", ETH_CHAIN_ID, "eth");
    await expect(
      b.build(params("bnb", "ethereum-mainnet"), ANVIL_ADDRESS_0),
    ).rejects.toThrow(/requires a native assetRef/);
  });
});
