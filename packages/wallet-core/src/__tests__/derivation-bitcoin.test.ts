import { describe, expect, it } from "vitest";

import { mnemonicToSeedSync } from "../bip39";
import {
  BITCOIN_MAINNET_PATH_PARTS,
  BITCOIN_TESTNET_PATH_PARTS,
  bitcoinP2WPKHScript,
  deriveBitcoinIdentity,
  encodeBitcoinP2WPKH,
} from "../derivation/bitcoin";

/**
 * 🔒 FROZEN — Dérivation Bitcoin BIP-84 (E2.1.b.1)
 *
 * Vecteurs officiels de la spec BIP-84 :
 *   https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 *
 * Mnemonic :
 *   "abandon abandon abandon abandon abandon abandon abandon abandon
 *    abandon abandon abandon about"
 *
 * Toute divergence = BUG. Les adresses `bc1q…` / `tb1q…` sont
 * sensibles à 1 caractère près — une erreur d'un bit produit une
 * adresse valide vers laquelle les fonds sont perdus.
 */

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";

// Testnet vectors officiels BIP-84.
const TESTNET_EXPECTED = {
  receive0: "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl",
  receive1: "tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97",
  change0: "tb1q9u62588spffmq4dzjxsr5l297znf3z6j5p2688",
} as const;

// Mainnet vectors officiels BIP-84.
const MAINNET_EXPECTED = {
  receive0: "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu",
  receive1: "bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g",
  change0: "bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el",
} as const;

function seedFromMnemonic(): Uint8Array {
  return mnemonicToSeedSync(MNEMONIC);
}

describe("🔒 Bitcoin BIP-84 — path parts", () => {
  it("mainnet : purpose 84', coinType 0'", () => {
    expect(BITCOIN_MAINNET_PATH_PARTS).toEqual({
      purpose: 84,
      coinType: 0,
      account: 0,
      change: 0,
      index: 0,
    });
  });

  it("testnet : purpose 84', coinType 1'", () => {
    expect(BITCOIN_TESTNET_PATH_PARTS).toEqual({
      purpose: 84,
      coinType: 1,
      account: 0,
      change: 0,
      index: 0,
    });
  });
});

describe("🔒 Bitcoin BIP-84 — testnet (coinType 1)", () => {
  const seed = seedFromMnemonic();

  it("m/84'/1'/0'/0/0 → tb1q6rz…", () => {
    const id = deriveBitcoinIdentity(seed, {
      network: "testnet",
      change: 0,
      index: 0,
    });
    expect(id.path).toBe("m/84'/1'/0'/0/0");
    expect(id.address).toBe(TESTNET_EXPECTED.receive0);
  });

  it("m/84'/1'/0'/0/1 → tb1qd7s…", () => {
    const id = deriveBitcoinIdentity(seed, {
      network: "testnet",
      change: 0,
      index: 1,
    });
    expect(id.path).toBe("m/84'/1'/0'/0/1");
    expect(id.address).toBe(TESTNET_EXPECTED.receive1);
  });

  it("m/84'/1'/0'/1/0 (change) → tb1q9u6…", () => {
    const id = deriveBitcoinIdentity(seed, {
      network: "testnet",
      change: 1,
      index: 0,
    });
    expect(id.path).toBe("m/84'/1'/0'/1/0");
    expect(id.address).toBe(TESTNET_EXPECTED.change0);
  });

  it("clé publique est 33 bytes compressed (0x02 / 0x03 prefix)", () => {
    const id = deriveBitcoinIdentity(seed, {
      network: "testnet",
      change: 0,
    });
    expect(id.publicKeyCompressed).toHaveLength(33);
    expect([0x02, 0x03]).toContain(id.publicKeyCompressed[0]);
  });
});

describe("🔒 Bitcoin BIP-84 — mainnet (coinType 0)", () => {
  const seed = seedFromMnemonic();

  it("m/84'/0'/0'/0/0 → bc1qcr8…", () => {
    const id = deriveBitcoinIdentity(seed, {
      network: "mainnet",
      change: 0,
      index: 0,
    });
    expect(id.path).toBe("m/84'/0'/0'/0/0");
    expect(id.address).toBe(MAINNET_EXPECTED.receive0);
  });

  it("m/84'/0'/0'/0/1 → bc1qnjg…", () => {
    const id = deriveBitcoinIdentity(seed, {
      network: "mainnet",
      change: 0,
      index: 1,
    });
    expect(id.address).toBe(MAINNET_EXPECTED.receive1);
  });

  it("m/84'/0'/0'/1/0 (change) → bc1q8c6…", () => {
    const id = deriveBitcoinIdentity(seed, {
      network: "mainnet",
      change: 1,
      index: 0,
    });
    expect(id.address).toBe(MAINNET_EXPECTED.change0);
  });

  it("les adresses mainnet ≠ testnet (mêmes index, coinType différent)", () => {
    const mainnet = deriveBitcoinIdentity(seed, {
      network: "mainnet",
      change: 0,
      index: 0,
    });
    const testnet = deriveBitcoinIdentity(seed, {
      network: "testnet",
      change: 0,
      index: 0,
    });
    expect(mainnet.address).not.toBe(testnet.address);
    expect(mainnet.address.startsWith("bc1q")).toBe(true);
    expect(testnet.address.startsWith("tb1q")).toBe(true);
  });
});

describe("🔒 Bitcoin BIP-84 — scriptPubKey P2WPKH", () => {
  it("script = 0x00 0x14 <20 bytes hash160> (22 bytes)", () => {
    const seed = seedFromMnemonic();
    const id = deriveBitcoinIdentity(seed, {
      network: "testnet",
      change: 0,
    });
    expect(id.scriptPubKey).toHaveLength(22);
    expect(id.scriptPubKey[0]).toBe(0x00); // OP_0
    expect(id.scriptPubKey[1]).toBe(0x14); // push 20
  });

  it("le programme du script est le même que celui encodé dans l'adresse", () => {
    const seed = seedFromMnemonic();
    const id = deriveBitcoinIdentity(seed, {
      network: "testnet",
      change: 0,
    });
    // On ré-encode via encodeBitcoinP2WPKH → même adresse (déterministe).
    const reencoded = encodeBitcoinP2WPKH(id.publicKeyCompressed, "testnet");
    expect(reencoded).toBe(id.address);
  });
});

describe("Bitcoin BIP-84 — validations", () => {
  it("rejette un seed trop court", () => {
    expect(() =>
      deriveBitcoinIdentity(new Uint8Array(8), {
        network: "testnet",
        change: 0,
      }),
    ).toThrow(/at least 16 bytes/);
  });

  it("rejette un index négatif", () => {
    expect(() =>
      deriveBitcoinIdentity(seedFromMnemonic(), {
        network: "testnet",
        change: 0,
        index: -1,
      }),
    ).toThrow(/Invalid derivation index/);
  });

  it("rejette un change invalide (2)", () => {
    expect(() =>
      deriveBitcoinIdentity(seedFromMnemonic(), {
        network: "testnet",
        change: 2 as unknown as 0 | 1,
      }),
    ).toThrow(/Invalid change value/);
  });

  it("encodeBitcoinP2WPKH rejette une clé non-compressed", () => {
    expect(() => encodeBitcoinP2WPKH(new Uint8Array(65), "testnet")).toThrow(
      /must be 33 bytes/,
    );
  });

  it("bitcoinP2WPKHScript est déterministe", () => {
    const seed = seedFromMnemonic();
    const a = bitcoinP2WPKHScript(
      deriveBitcoinIdentity(seed, { network: "testnet", change: 0 })
        .publicKeyCompressed,
    );
    const b = bitcoinP2WPKHScript(
      deriveBitcoinIdentity(seed, { network: "testnet", change: 0 })
        .publicKeyCompressed,
    );
    expect(a).toEqual(b);
  });
});
