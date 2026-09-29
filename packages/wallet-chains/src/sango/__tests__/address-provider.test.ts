import { describe, expect, it } from "vitest";
import { SangoAddressProvider } from "../address-provider";
import { hexToBytes, mockSigner } from "./_helpers";
import type { AccountRef } from "../../types/account";

const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

// Golden vector wallet-core (address.test.ts) :
//   pubkey c68226…3242 → address hex 02291e07…01ab
const PUBKEY = hexToBytes(
  "c6822637c7d310ec57627be00ba259d253749f4aaf644470cffbe53a35f73242",
);
const EXPECTED_HEX = "0x02291e07839d715a4c78b8585449b7e367aa01ab";
const EXPECTED_TESTNET = "tsango1qg53upurn4c45nrchpv9gjdhudn65qdtv3xlde";
const EXPECTED_MAINNET = "sango1qg53upurn4c45nrchpv9gjdhudn65qdtr5l9u6";

describe("SangoAddressProvider", () => {
  it("derives the golden-vector address (hex)", async () => {
    const p = new SangoAddressProvider(mockSigner(PUBKEY));
    expect(await p.deriveAddress(ACCOUNT)).toBe(EXPECTED_HEX);
  });

  it("is deterministic", async () => {
    const p = new SangoAddressProvider(mockSigner(PUBKEY));
    const a = await p.deriveAddress(ACCOUNT);
    const b = await p.deriveAddress(ACCOUNT);
    expect(a).toBe(b);
  });

  it("validateAddress accepts hex", () => {
    const p = new SangoAddressProvider(mockSigner());
    expect(p.validateAddress(EXPECTED_HEX)).toBe(true);
  });

  it("validateAddress accepts bech32m (both networks)", () => {
    const p = new SangoAddressProvider(mockSigner());
    expect(p.validateAddress(EXPECTED_TESTNET)).toBe(true);
    expect(p.validateAddress(EXPECTED_MAINNET)).toBe(true);
  });

  it("validateAddress rejects garbage", () => {
    const p = new SangoAddressProvider(mockSigner());
    expect(p.validateAddress("")).toBe(false);
    expect(p.validateAddress("hello")).toBe(false);
    expect(p.validateAddress("0xdeadbeef")).toBe(false);
  });
});
