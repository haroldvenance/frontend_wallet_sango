import { describe, expect, it } from "vitest";

import { mnemonicToSeedSync } from "../../bip39/mnemonic";
import { deriveSangoIdentity, formatSangoPath } from "../sango";

/**
 * Phase 5.1 — SangoIdentity via SLIP-0010.
 *
 * ⚠️ Le test « EXTRACTION vecteur §3.6 » est **temporaire**. Il sert
 * à figer le vecteur SANGO officiel dans `docs/design/hd-derivation.md`
 * §3.6. Il sera remplacé en 5.1.bis par une assertion déterministe
 * sur les mêmes valeurs.
 */

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";

const toHex = (u: Uint8Array): string =>
  Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");

describe("formatSangoPath", () => {
  it("forme m/44'/9999'/0'/0'/0' (spec §2.1)", () => {
    expect(formatSangoPath(0)).toBe("m/44'/9999'/0'/0'/0'");
  });

  it("change avec account", () => {
    expect(formatSangoPath(3)).toBe("m/44'/9999'/3'/0'/0'");
  });

  it("refuse un account négatif ou non-entier", () => {
    expect(() => formatSangoPath(-1)).toThrow();
    expect(() => formatSangoPath(1.5)).toThrow();
  });
});

describe("deriveSangoIdentity", () => {
  const seed = mnemonicToSeedSync(MNEMONIC);

  it("dérive une identité déterministe", () => {
    const a = deriveSangoIdentity(seed);
    const b = deriveSangoIdentity(seed);
    expect(a.addressHex).toBe(b.addressHex);
    expect(a.path).toBe("m/44'/9999'/0'/0'/0'");
    expect(a.privateKey).toHaveLength(32);
    expect(a.publicKey).toHaveLength(32);
    expect(a.address).toHaveLength(20);
    expect(a.addressBech32Testnet.startsWith("tsango1")).toBe(true);
  });

  it("account 0 ≠ account 1", () => {
    const a0 = deriveSangoIdentity(seed, { account: 0 });
    const a1 = deriveSangoIdentity(seed, { account: 1 });
    expect(a0.addressHex).not.toBe(a1.addressHex);
    expect(a0.path).toBe("m/44'/9999'/0'/0'/0'");
    expect(a1.path).toBe("m/44'/9999'/1'/0'/0'");
  });

  it("seed différent → adresse différente", () => {
    const otherSeed = new Uint8Array(64).fill(0xab);
    const a = deriveSangoIdentity(seed);
    const b = deriveSangoIdentity(otherSeed);
    expect(a.addressHex).not.toBe(b.addressHex);
  });

  // ═══════════════════════════════════════════════════════════
  //  Vecteur officiel §3.6 (figé en 5.1.bis)
  //  Contrat interopérable TS ↔ Rust — toute divergence est un bug
  //  bloquant. Voir docs/design/hd-derivation.md §3.6.
  // ═══════════════════════════════════════════════════════════
  describe("vecteur §3.6 (figé 5.1.bis)", () => {
    const id = deriveSangoIdentity(seed);

    it("path = m/44'/9999'/0'/0'/0'", () => {
      expect(id.path).toBe("m/44'/9999'/0'/0'/0'");
    });

    it("privkey = b736c780...a6d110", () => {
      expect(toHex(id.privateKey)).toBe(
        "b736c780921580894aacf48b5d4b0f8e8557472f408ded838a680bf636a6d110",
      );
    });

    it("pubkey = f9dbc57d...d7d94e", () => {
      expect(toHex(id.publicKey)).toBe(
        "f9dbc57dc6652dc4183bd47f31cfce4671d448571204de0dcdd6fb752ed7d94e",
      );
    });

    it("address = 0x16e6e725...93f420", () => {
      expect(id.addressHex).toBe(
        "0x16e6e7257de0d84e50c3f99c5470e5226893f420",
      );
    });

    it("bech32m = tsango1zmnwwftaurvyu5xrlxw9gu89yf5f8apq464ne9", () => {
      expect(id.addressBech32Testnet).toBe(
        "tsango1zmnwwftaurvyu5xrlxw9gu89yf5f8apq464ne9",
      );
    });
  });
});
