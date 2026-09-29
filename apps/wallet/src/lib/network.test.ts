import { describe, expect, it } from "vitest";
import { SANGO_DEVNET_NETWORK_ID, resolveSangoNetworkId } from "./network";

describe("resolveSangoNetworkId", () => {
  it("testnet → sango-devnet (limitation V0)", () => {
    expect(resolveSangoNetworkId("testnet")).toBe(SANGO_DEVNET_NETWORK_ID);
  });

  it("mainnet → sango-devnet (limitation V0)", () => {
    expect(resolveSangoNetworkId("mainnet")).toBe(SANGO_DEVNET_NETWORK_ID);
  });
});
