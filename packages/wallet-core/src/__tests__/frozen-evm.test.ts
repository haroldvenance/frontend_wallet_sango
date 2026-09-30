import { describe, expect, it } from "vitest";

import { Bip39Wallet } from "../bip39-wallet";
import { secp256k1Verify } from "../secp256k1";
import { deriveEvmKeypair } from "../derivation";

/**
 * 🔒 TEST DE GEL — EVM byte-à-byte
 *
 * Équivalent du `frozen-sango.test.ts` pour la famille EVM. Fige :
 *   1. Mnemonic fixe → adresse EVM figée (Hardhat/Anvil standard).
 *   2. Signature secp256k1 sur digest fixe → snapshot des bytes.
 *
 * ⚠️ Toute divergence future doit être traitée comme un bug, pas
 *    comme un snapshot à mettre à jour.
 *
 * ## Golden vectors (publics, standards)
 *  - mnemonic        : Hardhat/Anvil par défaut
 *  - privkey #0      : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 *  - address #0      : 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
 */

const FROZEN_MNEMONIC =
  "test test test test test test test test test test test junk";

const FROZEN_PRIVKEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const FROZEN_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

function toHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("🔒 FROZEN — EVM identity", () => {
  it("mnemonic → private key #0 (Hardhat golden vector)", async () => {
    const w = await Bip39Wallet.fromMnemonic(FROZEN_MNEMONIC);
    // On récupère la privkey via getIdentity (publicKeyCompressed
    // vérifié) + dérivation directe pour lire la privkey.
    // (L'API wallet n'expose pas la privkey — c'est intentionnel.)
    const kp = deriveEvmKeypair(
      // reproduction : seed BIP-39 dérivé de la mnemonic
      (await import("../bip39")).mnemonicToSeedSync(FROZEN_MNEMONIC),
      0,
    );
    expect(toHex(kp.privateKey)).toBe(FROZEN_PRIVKEY_0);
    expect(w.defaultAddress).toBe(FROZEN_ADDRESS_0);
  });

  it("default address is frozen", async () => {
    const w = await Bip39Wallet.fromMnemonic(FROZEN_MNEMONIC);
    expect(w.defaultAddress).toBe(FROZEN_ADDRESS_0);
  });

  it("identity #1 has a distinct frozen address", async () => {
    const w = await Bip39Wallet.fromMnemonic(FROZEN_MNEMONIC);
    const id1 = w.getIdentity(1);
    // Snapshot : l'adresse #1 est figée.
    expect(id1.addressHex).toMatchSnapshot("address-1-hex");
  });
});

describe("🔒 FROZEN — EVM signature (snapshot)", () => {
  it("signDigest(fixed 32-byte digest) is stable", async () => {
    const w = await Bip39Wallet.fromMnemonic(FROZEN_MNEMONIC);
    const digest = new Uint8Array(32).fill(0x42);
    const sig = await w.signDigest(digest);
    expect(sig).toHaveLength(64);
    expect(toHex(sig)).toMatchSnapshot("secp256k1-signature-hex");
  });

  it("signDomain(fixed domain || payload) is stable", async () => {
    const w = await Bip39Wallet.fromMnemonic(FROZEN_MNEMONIC);
    const domain = new TextEncoder().encode("EVM/TEST/V1");
    const payload = new TextEncoder().encode("frozen");
    const sig = await w.signDomain(domain, payload);
    expect(toHex(sig)).toMatchSnapshot("secp256k1-signDomain-hex");
  });

  it("signature on fixed digest verifies against the frozen address", async () => {
    const w = await Bip39Wallet.fromMnemonic(FROZEN_MNEMONIC);
    const digest = new Uint8Array(32).fill(0x42);
    const sig = await w.signDigest(digest);

    const kp = deriveEvmKeypair(
      (await import("../bip39")).mnemonicToSeedSync(FROZEN_MNEMONIC),
      0,
    );
    expect(secp256k1Verify(kp.publicKeyCompressed, digest, sig)).toBe(true);
  });
});
