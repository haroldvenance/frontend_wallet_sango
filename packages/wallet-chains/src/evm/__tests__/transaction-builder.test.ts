import { describe, expect, it, vi } from "vitest";

import { EvmTransactionBuilder } from "../transaction-builder";
import type { EvmCallParams } from "../rpc";
import type { SendParams } from "../../capabilities/transaction-builder";
import type { AssetRef } from "../../types/asset";
import { ANVIL_ADDRESS_0, mockRpc } from "./_helpers";

const NATIVE_ETH: AssetRef = {
  kind: "native",
  assetId: "eth",
  networkId: "ethereum-sepolia",
};
const TO = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as `0x${string}`;
const SEPOLIA_CHAIN_ID = 11_155_111;

function makeBuilder(rpc = mockRpc()) {
  return new EvmTransactionBuilder(
    rpc,
    "ethereum-sepolia",
    SEPOLIA_CHAIN_ID,
    "eth",
  );
}

const TRANSFER_PARAMS: SendParams = {
  kind: "transfer",
  to: TO,
  assetRef: NATIVE_ETH,
  amount: 1_000_000_000_000_000_000n,
};

describe("EvmTransactionBuilder — transfer", () => {
  it("builds EIP-1559 fields from RPC data", async () => {
    const rpc = mockRpc({
      getTransactionCount: vi.fn(async () => 7),
      estimateGas: vi.fn(async () => 21_000n),
      getBaseFeePerGas: vi.fn(async () => 10_000_000_000n),
      getMaxPriorityFeePerGas: vi.fn(async () => 1_000_000_000n),
    });
    const b = makeBuilder(rpc);
    const tx = await b.build(TRANSFER_PARAMS, ANVIL_ADDRESS_0);

    expect(tx.family).toBe("evm");
    expect(tx.networkId).toBe("ethereum-sepolia");
    const p = tx.payload as Record<string, unknown>;
    expect(p.chainId).toBe(SEPOLIA_CHAIN_ID);
    expect(p.nonce).toBe(7);
    expect(p.to).toBe(TO);
    expect(p.value).toBe(1_000_000_000_000_000_000n);
    expect(p.gasLimit).toBe(21_000n);
    expect(p.maxFeePerGas).toBe(21_000_000_000n);
    expect(p.maxPriorityFeePerGas).toBe(1_000_000_000n);
    expect(p.data).toBeUndefined();
  });

  it("forwards `memo` as data", async () => {
    const b = makeBuilder();
    const tx = await b.build(
      { ...TRANSFER_PARAMS, memo: new Uint8Array([0xde, 0xad]) },
      ANVIL_ADDRESS_0,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.data).toBe("0xdead");
  });

  it("meta reflects sender, to, amount", async () => {
    const b = makeBuilder();
    const tx = await b.build(TRANSFER_PARAMS, ANVIL_ADDRESS_0);
    expect(tx.meta.from).toBe(ANVIL_ADDRESS_0);
    expect(tx.meta.to).toBe(TO);
    expect(tx.meta.amount).toBe(1_000_000_000_000_000_000n);
  });

  it("calls getTransactionCount with the sender", async () => {
    const getTransactionCount = vi.fn(async () => 0);
    const b = makeBuilder(mockRpc({ getTransactionCount }));
    await b.build(TRANSFER_PARAMS, ANVIL_ADDRESS_0);
    expect(getTransactionCount).toHaveBeenCalledWith(ANVIL_ADDRESS_0);
  });
});

describe("EvmTransactionBuilder — validation", () => {
  it("rejects non-transfer kinds (staking is SANGO-only)", async () => {
    const b = makeBuilder();
    const bondParams = {
      kind: "bond" as const,
      assetRef: NATIVE_ETH,
      amount: 1n,
    };
    await expect(b.build(bondParams, ANVIL_ADDRESS_0)).rejects.toThrow(
      /unsupported send kind "bond"/,
    );
  });

  it("rejects token assetRef", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        {
          kind: "transfer",
          to: TO,
          assetRef: { kind: "token", networkId: "ethereum-sepolia", contract: "0x" },
          amount: 1n,
        },
        ANVIL_ADDRESS_0,
      ),
    ).rejects.toThrow(/requires a native assetRef/);
  });

  it("rejects mismatched network", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        {
          kind: "transfer",
          to: TO,
          assetRef: { kind: "native", assetId: "eth", networkId: "ethereum-mainnet" },
          amount: 1n,
        },
        ANVIL_ADDRESS_0,
      ),
    ).rejects.toThrow(/network mismatch/);
  });
});

// ── E1.6 : transferErc20 ────────────────────────────────────

import { encodeFunctionData } from "viem";
import { ERC20_ABI } from "../erc20-abi";

const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;
const ERC20_ASSET_REF: AssetRef = {
  kind: "token",
  networkId: "ethereum-mainnet",
  contract: USDC_CONTRACT,
};

function erc20Params(
  overrides: Partial<Extract<SendParams, { kind: "transferErc20" }>> = {},
): Extract<SendParams, { kind: "transferErc20" }> {
  return {
    kind: "transferErc20",
    to: TO,
    assetRef: ERC20_ASSET_REF,
    amount: 1_000_000n, // 1 USDC (6 decimals)
    ...overrides,
  };
}

const ERC20_CHAIN_ID = 1; // Ethereum Mainnet

function makeErc20Builder(rpc = mockRpc()) {
  return new EvmTransactionBuilder(
    rpc,
    "ethereum-mainnet",
    ERC20_CHAIN_ID,
    "eth",
  );
}

const FROM = ("0x" + "cc".repeat(20)) as `0x${string}`;

describe("EvmTransactionBuilder — transferErc20", () => {
  it("encodes transfer(address,uint256) into `data`, sets value=0n, to=contract", async () => {
    const rpc = mockRpc({
      getTransactionCount: vi.fn(async () => 7),
      estimateGas: vi.fn(async () => 65_000n),
      getBaseFeePerGas: vi.fn(async () => 10_000_000_000n),
      getMaxPriorityFeePerGas: vi.fn(async () => 1_000_000_000n),
    });
    const b = makeErc20Builder(rpc);
    const tx = await b.build(erc20Params(), FROM);

    expect(tx.family).toBe("evm");
    expect(tx.networkId).toBe("ethereum-mainnet");

    const p = tx.payload as Record<string, unknown>;
    expect(p.chainId).toBe(ERC20_CHAIN_ID);
    expect(p.nonce).toBe(7);
    // Le `to` de la tx est le CONTRAT, pas le destinataire.
    expect(p.to).toBe(USDC_CONTRACT);
    // Pas de value (transfert de token).
    expect(p.value).toBe(0n);
    // Gas issu d'eth_estimateGas.
    expect(p.gasLimit).toBe(65_000n);
    // Fees identiques au transfert natif.
    expect(p.maxFeePerGas).toBe(21_000_000_000n);
    expect(p.maxPriorityFeePerGas).toBe(1_000_000_000n);

    // Le `data` est exactement `transfer(to, amount)`.
    const expected = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [TO as `0x${string}`, 1_000_000n],
    });
    expect(p.data).toBe(expected);
  });

  it("hardcoded: transfer(0x…bbbb, 1000) has the expected selector + args", async () => {
    const rpc = mockRpc({
      getTransactionCount: vi.fn(async () => 0),
      estimateGas: vi.fn<(tx: EvmCallParams) => Promise<bigint>>(async () => 45_000n),
      getBaseFeePerGas: vi.fn(async () => 1n),
      getMaxPriorityFeePerGas: vi.fn(async () => 0n),
    });
    const b = makeErc20Builder(rpc);
    const tx = await b.build(
      erc20Params({ amount: 1000n }),
      FROM,
    );
    const data = (tx.payload as Record<string, unknown>).data as string;

    // Selector ERC-20 transfer = 0xa9059cbb
    expect(data.startsWith("0xa9059cbb")).toBe(true);

    // 32 bytes address (padded) + 32 bytes amount (uint256, big-endian).
    // Le `to` du test est TO = 0x7099… (pas 0xbbbb…).
    const recipientPadded = TO.slice(2).padStart(64, "0");
    const amountPadded = (1000n).toString(16).padStart(64, "0");
    const expected = "0xa9059cbb" + recipientPadded + amountPadded;
    expect(data).toBe(expected);

    // Longueur : "0x" + 4 bytes selector + 32 + 32 = 2 + 8 + 64 + 64 = 138
    expect(data.length).toBe(138);
  });

  it("meta.from = sender, meta.to = recipient (not contract)", async () => {
    const b = makeErc20Builder();
    const tx = await b.build(erc20Params(), FROM);
    expect(tx.meta.from).toBe(FROM);
    expect(tx.meta.to).toBe(TO);
    expect(tx.meta.amount).toBe(1_000_000n);
    expect(tx.meta.assetRef).toEqual(ERC20_ASSET_REF);
  });

  it("uses eth_estimateGas with to=contract + data, not value", async () => {
    const estimateGas = vi.fn<(tx: EvmCallParams) => Promise<bigint>>(async () => 65_000n);
    const b = makeErc20Builder(
      mockRpc({
        estimateGas,
        getBaseFeePerGas: vi.fn(async () => 1n),
        getMaxPriorityFeePerGas: vi.fn(async () => 0n),
      }),
    );
    await b.build(erc20Params(), FROM);

    const arg = estimateGas.mock.calls[0]![0];
    expect(arg.from).toBe(FROM);
    expect(arg.to).toBe(USDC_CONTRACT);
    expect(arg.value).toBe(0n);
    expect(typeof arg.data).toBe("string");
    expect((arg.data as string).startsWith("0xa9059cbb")).toBe(true);
  });

  it("rejects a native ETH assetRef", async () => {
    const b = makeErc20Builder();
    await expect(
      b.build(
        {
          kind: "transferErc20",
          to: TO,
          assetRef: { kind: "native", assetId: "eth", networkId: "ethereum-mainnet" },
          amount: 1n,
        },
        FROM,
      ),
    ).rejects.toThrow(/requires a token assetRef/);
  });

  it("rejects a network mismatch", async () => {
    const b = makeErc20Builder();
    await expect(
      b.build(
        erc20Params({
          assetRef: {
            kind: "token",
            networkId: "base",
            contract: USDC_CONTRACT,
          },
        }),
        FROM,
      ),
    ).rejects.toThrow(/network mismatch/);
  });
});
