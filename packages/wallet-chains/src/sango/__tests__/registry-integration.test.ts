import { describe, expect, it, vi } from "vitest";
import { createChainRegistry } from "../../registry/chain-registry";
import { sangoAdapterFactory } from "../adapter";
import { SANGO_DEVNET, type SangoNetwork } from "../config";
import { mockRpc, mockSigner } from "./_helpers";

describe("ChainRegistry + SangoAdapter (integration)", () => {
  it("registers SANGO_DEVNET and gets a full adapter via the factory", () => {
    const registry = createChainRegistry();
    const rpc = mockRpc();
    const signer = mockSigner();

    const factory = vi.fn((network: SangoNetwork) =>
      sangoAdapterFactory(network, { rpc, signer }),
    );

    registry.register(SANGO_DEVNET, (n) => factory(n as SangoNetwork));
    expect(factory).not.toHaveBeenCalled();

    const adapter = registry.get("sango-devnet");
    expect(adapter).toBeDefined();
    expect(factory).toHaveBeenCalledTimes(1);

    // Toutes les capacités attendues sont présentes.
    expect(adapter!.addressProvider).toBeDefined();
    expect(adapter!.balanceProvider).toBeDefined();
    expect(adapter!.historyProvider).toBeDefined();
    expect(adapter!.transactionBuilder).toBeDefined();
    expect(adapter!.transactionSigner).toBeDefined();
    expect(adapter!.broadcaster).toBeDefined();
    expect(adapter!.feeEstimator).toBeDefined();
    expect(adapter!.tokenProvider).toBeUndefined();
  });

  it("listByFamily('sango') exposes SANGO_DEVNET", () => {
    const registry = createChainRegistry();
    registry.register(SANGO_DEVNET, (n) =>
      sangoAdapterFactory(n as SangoNetwork, {
        rpc: mockRpc(),
        signer: mockSigner(),
      }),
    );
    const sango = registry.listByFamily("sango").map((n) => n.id);
    expect(sango).toContain("sango-devnet");
  });
});
