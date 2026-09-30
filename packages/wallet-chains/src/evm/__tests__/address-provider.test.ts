import { describe, expect, it, vi } from "vitest";

import { EvmAddressProvider } from "../address-provider";
import {
  ANVIL_ADDRESS_0,
  ANVIL_PUBKEY_UNCOMPRESSED,
  EVM_ACCOUNT,
  mockSigner,
} from "./_helpers";

describe("EvmAddressProvider", () => {
  it("derives the Anvil/0 address from the well-known pubkey", async () => {
    const p = new EvmAddressProvider(mockSigner());
    const address = await p.deriveAddress(EVM_ACCOUNT);
    expect(address).toBe(ANVIL_ADDRESS_0);
  });

  it("is deterministic", async () => {
    const p = new EvmAddressProvider(mockSigner());
    const a = await p.deriveAddress(EVM_ACCOUNT);
    const b = await p.deriveAddress(EVM_ACCOUNT);
    expect(a).toBe(b);
  });

  it("forwards the account to the signer", async () => {
    const signer = mockSigner();
    const p = new EvmAddressProvider(signer);
    await p.deriveAddress(EVM_ACCOUNT);
    expect(signer.getPublicKey).toHaveBeenCalledWith(EVM_ACCOUNT);
  });

  it("rejects a 32-byte (compressed/Ed25519) public key", async () => {
    const bad = new Uint8Array(32).fill(0x01);
    const p = new EvmAddressProvider(mockSigner(bad));
    await expect(p.deriveAddress(EVM_ACCOUNT)).rejects.toThrow(
      /must return 65 bytes/,
    );
  });

  it("rejects a 65-byte pubkey without the 0x04 prefix", async () => {
    const bad = new Uint8Array(ANVIL_PUBKEY_UNCOMPRESSED);
    bad[0] = 0x03;
    const p = new EvmAddressProvider(mockSigner(bad));
    await expect(p.deriveAddress(EVM_ACCOUNT)).rejects.toThrow(/0x04/);
  });

  it("validateAddress accepts lowercase/mixed hex", () => {
    const p = new EvmAddressProvider(mockSigner());
    expect(p.validateAddress(ANVIL_ADDRESS_0)).toBe(true);
    expect(p.validateAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(true);
    expect(p.validateAddress("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")).toBe(true);
  });

  it("validateAddress rejects garbage", () => {
    const p = new EvmAddressProvider(mockSigner());
    expect(p.validateAddress("")).toBe(false);
    expect(p.validateAddress("0x")).toBe(false);
    expect(p.validateAddress("0x123")).toBe(false);
    expect(p.validateAddress("f39fd6e51aad88f6f4ce6ab8827279cfffb92266")).toBe(false); // no 0x
    expect(p.validateAddress("0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600")).toBe(false); // too long
    expect(p.validateAddress("0xZZZfd6e51aad88f6f4ce6ab8827279cfffb92266")).toBe(false); // non-hex
  });
});
