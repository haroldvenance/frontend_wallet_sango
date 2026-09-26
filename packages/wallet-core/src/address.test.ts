import { describe, expect, it } from "vitest";
import { bech32, bech32m } from "@scure/base";

import {
  decodeNativeAddress,
  tryDecodeAnyNetwork,
  deriveNativeAddress,
  encodeNativeAddress,
  nativeAddressToHex,
} from "./address";
import { keypairFromSeed } from "./keypair";

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

const PUBLIC_KEY_HEX =
  "c6822637c7d310ec57627be00ba259d253749f4aaf644470cffbe53a35f73242";
const ADDRESS_HEX = "02291e07839d715a4c78b8585449b7e367aa01ab";

// Golden vectors officiels — validés côté Rust
// (bech32m::tests::golden_vector_known_address) et côté TS via @scure/base.
// Variante Bech32m (BIP-350), HRP "sango"/"tsango", payload = toWords(address20),
// aucun préfixe. Les valeurs Bech32 classique ("…kg0fec" / "…edkngm") sont
// volontairement rejetées (voir bloc decodeNativeAddress plus bas).
const GOLDEN_MAINNET = "sango1qg53upurn4c45nrchpv9gjdhudn65qdtr5l9u6";
const GOLDEN_TESTNET = "tsango1qg53upurn4c45nrchpv9gjdhudn65qdtv3xlde";

describe("Sango native address", () => {
  it("matches the Rust golden vector", async () => {
    const seed = new Uint8Array(32).fill(0x55);

    const expectedPublicKey = hexToBytes(PUBLIC_KEY_HEX);
    const expectedAddress = hexToBytes(ADDRESS_HEX);

    const keypair = await keypairFromSeed(seed);

    expect(keypair.publicKey).toEqual(expectedPublicKey);

    const address = deriveNativeAddress(keypair.publicKey);

    expect(address).toEqual(expectedAddress);

    expect(nativeAddressToHex(address)).toBe(
      "0x02291e07839d715a4c78b8585449b7e367aa01ab",
    );
  });

  it("produces exactly 20 bytes", () => {
    const publicKey = hexToBytes(PUBLIC_KEY_HEX);

    const address = deriveNativeAddress(publicKey);

    expect(address).toHaveLength(20);
  });

  it("encodes the mainnet address with Bech32m", () => {
    const address = hexToBytes(ADDRESS_HEX);

    expect(encodeNativeAddress(address, "mainnet")).toBe(GOLDEN_MAINNET);
  });

  it("encodes the testnet address with Bech32m", () => {
    const address = hexToBytes(ADDRESS_HEX);

    expect(encodeNativeAddress(address, "testnet")).toBe(GOLDEN_TESTNET);
  });
});

describe("Sango native address — decodeNativeAddress", () => {
  it("round-trips the mainnet golden vector", () => {
    const decoded = decodeNativeAddress(GOLDEN_MAINNET, "mainnet");

    expect(nativeAddressToHex(decoded)).toBe(`0x${ADDRESS_HEX}`);
  });

  it("round-trips the testnet golden vector", () => {
    const decoded = decodeNativeAddress(GOLDEN_TESTNET, "testnet");

    expect(nativeAddressToHex(decoded)).toBe(`0x${ADDRESS_HEX}`);
  });

  it("rejects a Bech32m-invalid checksum (old typo)", () => {
    expect(() =>
      decodeNativeAddress(
        "sango1qg53upurn4c45nrchpv9gjdhudn65qdtk2cmcf",
        "mainnet",
      ),
    ).toThrow();
  });

  it("rejects a Bech32 classic checksum (mainnet)", () => {
    expect(() =>
      decodeNativeAddress(
        "sango1qg53upurn4c45nrchpv9gjdhudn65qdtkg0fec",
        "mainnet",
      ),
    ).toThrow();
  });

  it("rejects a Bech32 classic checksum (testnet)", () => {
    expect(() =>
      decodeNativeAddress(
        "tsango1qg53upurn4c45nrchpv9gjdhudn65qdtedkngm",
        "testnet",
      ),
    ).toThrow();
  });

  it("rejects an unknown HRP", () => {
    expect(() =>
      decodeNativeAddress(
        "btc1qg53upurn4c45nrchpv9gjdhudn65qdtr5l9u6",
        "mainnet",
      ),
    ).toThrow();
  });

  it("rejects a HRP / network mismatch", () => {
    expect(() => decodeNativeAddress(GOLDEN_MAINNET, "testnet")).toThrow();
    expect(() => decodeNativeAddress(GOLDEN_TESTNET, "mainnet")).toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => decodeNativeAddress("", "mainnet")).toThrow();
  });

  it("rejects a wrong payload length (21 bytes)", () => {
    const bad = bech32m.encode(
      "sango",
      bech32m.toWords(new Uint8Array(21)),
    );

    expect(() => decodeNativeAddress(bad, "mainnet")).toThrow();
  });
});


describe("tryDecodeAnyNetwork", () => {
  const addr20 = new Uint8Array(20).fill(0xaa);

  it("decodes mainnet", () => {
    const s = encodeNativeAddress(addr20, "mainnet");
    const { address, network } = tryDecodeAnyNetwork(s);
    expect(network).toBe("mainnet");
    expect(Array.from(address)).toEqual(Array.from(addr20));
  });

  it("decodes testnet", () => {
    const s = encodeNativeAddress(addr20, "testnet");
    const { address, network } = tryDecodeAnyNetwork(s);
    expect(network).toBe("testnet");
    expect(Array.from(address)).toEqual(Array.from(addr20));
  });

  it("rejects unknown HRP", () => {
    const s = bech32m.encode("btc", bech32m.toWords(addr20));
    expect(() => tryDecodeAnyNetwork(s)).toThrow(/unknown HRP/);
  });

  it("rejects invalid checksum", () => {
    expect(() => tryDecodeAnyNetwork("sango1invalid")).toThrow();
  });

  it("rejects wrong payload length", () => {
    const short = bech32m.encode("sango", bech32m.toWords(new Uint8Array(10)));
    expect(() => tryDecodeAnyNetwork(short)).toThrow(/invalid address length/);
  });

  it("rejects Bech32 classic (not m)", () => {
    const s = bech32.encode("sango", bech32.toWords(addr20));
    expect(() => tryDecodeAnyNetwork(s)).toThrow();
  });
});
