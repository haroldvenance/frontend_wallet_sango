import { beforeAll, describe, expect, it, vi } from "vitest";

import { createEvmIndexer } from "../indexer-factory";

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("createEvmIndexer — Phase 9.5.b", () => {
  it("Ethereum mainnet + clé → EtherscanIndexer", () => {
    const idx = createEvmIndexer({ chainId: 1, etherscanApiKey: "ABC" });
    expect(idx).toBeDefined();
  });

  it("BSC (56) sans clé → Routescan", () => {
    const idx = createEvmIndexer({ chainId: 56 });
    expect(idx).toBeDefined();
  });

  it("Base (8453) → Routescan", () => {
    const idx = createEvmIndexer({ chainId: 8453 });
    expect(idx).toBeDefined();
  });

  it("BSC avec clé Etherscan → Routescan quand même", () => {
    const idx = createEvmIndexer({ chainId: 56, etherscanApiKey: "ABC" });
    expect(idx).toBeDefined();
  });

  it("chainId inconnu → undefined", () => {
    const idx = createEvmIndexer({ chainId: 999999 });
    expect(idx).toBeUndefined();
  });

  it("Ethereum sans clé → undefined", () => {
    const idx = createEvmIndexer({ chainId: 1 });
    expect(idx).toBeUndefined();
  });
});
