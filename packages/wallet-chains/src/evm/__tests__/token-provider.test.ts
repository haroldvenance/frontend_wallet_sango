import { describe, expect, it, vi } from "vitest";
import { encodeFunctionResult } from "viem";

import { EvmTokenProvider } from "../token-provider";
import { ERC20_ABI } from "../erc20-abi";
import { asAddress } from "../../types/address";
import type { Token } from "../../types/token";
import { mockRpc } from "./_helpers";

const ADDR = asAddress("aa".repeat(20));
const USDC_CONTRACT = asAddress("a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
const USDT_CONTRACT = asAddress("dac17f958d2ee523a2206206994597c13d831ec7");

const USDC_TOKEN: Token = {
  networkId: "ethereum-mainnet",
  contract: USDC_CONTRACT,
  assetId: "usdc",
  metadata: { name: "USD Coin", symbol: "USDC", decimals: 6 },
};

/** Encode un uint256 balanceOf en 32 bytes. */
function balanceHex(amount: bigint): `0x${string}` {
  return encodeFunctionResult({
    abi: ERC20_ABI,
    functionName: "balanceOf",
    result: amount,
  });
}

describe("EvmTokenProvider — listTokens", () => {
  it("returns the configured tokens for the network (Ethereum Mainnet)", async () => {
    const p = new EvmTokenProvider(mockRpc(), "ethereum-mainnet");
    const tokens = await p.listTokens("ethereum-mainnet");
    const symbols = tokens.map((t) => t.metadata.symbol).sort();
    expect(symbols).toEqual(["USDC", "USDT"]);
  });

  it("returns USDC only on Base", async () => {
    const p = new EvmTokenProvider(mockRpc(), "base");
    const tokens = await p.listTokens("base");
    expect(tokens.map((t) => t.metadata.symbol)).toEqual(["USDC"]);
  });

  it("returns empty for a mismatched networkId", async () => {
    const p = new EvmTokenProvider(mockRpc(), "ethereum-mainnet");
    const tokens = await p.listTokens("base");
    expect(tokens).toEqual([]);
  });

  it("returns empty for an unknown network", async () => {
    const p = new EvmTokenProvider(mockRpc(), "ethereum-mainnet");
    const tokens = await p.listTokens("unknown");
    expect(tokens).toEqual([]);
  });

  it("maps symbol + decimals from config (no eth_call)", async () => {
    const rpc = mockRpc();
    const p = new EvmTokenProvider(rpc, "ethereum-mainnet");
    const tokens = await p.listTokens("ethereum-mainnet");
    const usdc = tokens.find((t) => t.metadata.symbol === "USDC")!;
    expect(usdc.metadata.decimals).toBe(6);
    expect(usdc.metadata.name).toBe("USD Coin");
    expect(usdc.assetId).toBe("usdc");
    // Aucun appel RPC pour listTokens.
    expect(rpc.call).not.toHaveBeenCalled();
  });
});

describe("EvmTokenProvider — getTokenBalance", () => {
  it("calls eth_call with encodeFunctionData(balanceOf) and decodes uint256", async () => {
    const rpc = mockRpc({
      call: vi.fn(async () => balanceHex(1_234_567n)),
    });
    const p = new EvmTokenProvider(rpc, "ethereum-mainnet");
    const bal = await p.getTokenBalance(ADDR, USDC_TOKEN);

    expect(bal).toBe(1_234_567n);
    expect(rpc.call).toHaveBeenCalledTimes(1);

    const arg = (rpc.call as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.from).toBe(ADDR);
    expect(arg.to).toBe(USDC_CONTRACT);
    // Le selector `balanceOf(address)` = 0x70a08231
    expect(arg.data.startsWith("0x70a08231")).toBe(true);
    // L'adresse encodée sur 32 bytes
    expect(arg.data.slice(10)).toBe("aa".repeat(20).padStart(64, "0"));
  });

  it("returns 0n for a zero balance", async () => {
    const rpc = mockRpc({
      call: vi.fn(async () => balanceHex(0n)),
    });
    const p = new EvmTokenProvider(rpc, "ethereum-mainnet");
    expect(await p.getTokenBalance(ADDR, USDC_TOKEN)).toBe(0n);
  });

  it("handles very large balances (uint256 max-ish)", async () => {
    const big = 2n ** 200n;
    const rpc = mockRpc({
      call: vi.fn(async () => balanceHex(big)),
    });
    const p = new EvmTokenProvider(rpc, "ethereum-mainnet");
    expect(await p.getTokenBalance(ADDR, USDC_TOKEN)).toBe(big);
  });

  it("works for USDT on Arbitrum", async () => {
    const rpc = mockRpc({
      call: vi.fn(async () => balanceHex(42n)),
    });
    const p = new EvmTokenProvider(rpc, "arbitrum-one");
    const bal = await p.getTokenBalance(ADDR, {
      networkId: "arbitrum-one",
      contract: USDT_CONTRACT,
      assetId: "usdt",
      metadata: { name: "Tether USD", symbol: "USDT", decimals: 6 },
    });
    expect(bal).toBe(42n);
  });

  it("rejects a token on a different network", async () => {
    const p = new EvmTokenProvider(mockRpc(), "ethereum-mainnet");
    await expect(
      p.getTokenBalance(ADDR, {
        ...USDC_TOKEN,
        networkId: "base",
      }),
    ).rejects.toThrow(/does not match provider network/);
  });

  it("propagates eth_call errors (revert)", async () => {
    const rpc = mockRpc({
      call: vi.fn(async () => {
        throw new Error("execution reverted");
      }),
    });
    const p = new EvmTokenProvider(rpc, "ethereum-mainnet");
    await expect(p.getTokenBalance(ADDR, USDC_TOKEN)).rejects.toThrow(
      "execution reverted",
    );
  });
});
