import { describe, expect, it } from "vitest";
import {
  DOMAINS,
  TX_KIND,
  encodeUnsignedTransaction,
  restoreWallet,
  transactionHash,
  type UnsignedTransaction as WalletCoreUnsignedTx,
} from "@sango/wallet-core";

import { SangoTransactionSigner } from "../transaction-signer";
import type { AccountRef } from "../../types/account";
import type { Signer } from "../../types/signer";
import type { UnsignedTransaction as ChainsUnsignedTx } from "../../types/tx";

/**
 * Adaptateur `Wallet` → `Signer` inliné.
 *
 * ⚠️ Volontairement dupliqué de `wallet-session/src/signer.ts` : wallet-chains
 *    ne peut pas importer wallet-session (rootDir + sens des dépendances).
 *    Le test reste ainsi self-contained dans son package.
 */
function walletAsSigner(w: Awaited<ReturnType<typeof restoreWallet>>): Signer {
  return {
    async getPublicKey(): Promise<Uint8Array> {
      return w.identity.publicKey;
    },
    async signDomain(
      domain: Uint8Array,
      payload: Uint8Array,
    ): Promise<Uint8Array> {
      return w.signDomain(domain, payload);
    },
  };
}

/**
 * 🔒 TEST DE GEL — SANGO byte-à-byte (design doc §7.4)
 *
 * Ce test fige l'état actuel du pipeline SANGO **avant** la migration
 * UI (étape 7). Il servira de garde-fou pour toutes les refontes
 * futures : toute divergence d'un seul byte casse la CI.
 *
 * ⚠️ Ne JAMAIS modifier les valeurs figées ici sans un hard fork
 *    coordonné côté Rust. Si ce test casse après un refactor, c'est le
 *    refactor qu'il faut corriger, pas le test.
 *
 * ## Couverture
 *  1. Identité (seed fixe → pubkey, adresse hex, bech32m).
 *  2. Encodage unsigned d'une tx fixe (147 bytes, hex exact).
 *  3. Hash de tx (Keccak256(TX_V1 || unsigned_bytes)).
 *  4. Signature Ed25519 + raw complet 211 bytes (snapshot).
 *
 * ## Seed / golden vectors
 *  - seed          : `[0x55; 32]` (golden vector wallet-core)
 *  - pubkey        : `c6822637c7d310ec57627be00ba259d253749f4aaf644470cffbe53a35f73242`
 *  - adresse hex   : `0x02291e07839d715a4c78b8585449b7e367aa01ab`
 *  - adresse (m)   : `sango1qg53upurn4c45nrchpv9gjdhudn65qdtr5l9u6`
 *  - adresse (t)   : `tsango1qg53upurn4c45nrchpv9gjdhudn65qdtv3xlde`
 */

const SEED = new Uint8Array(32).fill(0x55);

const FROZEN_PUBKEY_HEX =
  "c6822637c7d310ec57627be00ba259d253749f4aaf644470cffbe53a35f73242";

const FROZEN_ADDRESS_HEX =
  "0x02291e07839d715a4c78b8585449b7e367aa01ab";

const FROZEN_ADDRESS_MAINNET =
  "sango1qg53upurn4c45nrchpv9gjdhudn65qdtr5l9u6";

const FROZEN_ADDRESS_TESTNET =
  "tsango1qg53upurn4c45nrchpv9gjdhudn65qdtv3xlde";

const FROZEN_TX_HASH =
  "0x59e52128cf567408e038a076e15f575b0a505657f8e0bb885d5e12359b09aaf0";

const FROZEN_UNSIGNED_HEX =
  "0x01000000" +
  "1111111111111111111111111111111111111111111111111111111111111111" +
  "2a00000000000000" +
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
  "00" +
  "0852000000000000" +
  "14000000000000000000000000000000" +
  "02000000000000000000000000000000" +
  "64000000000000000000000000000000" +
  "01" +
  "01" +
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" +
  "00000000";

const ACCOUNT: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

// --- Helpers ---------------------------------------------------------------

function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Transaction fixe, identique au golden vector Rust
 * (`sango-types::transaction::tests::golden_vector_fixed_transaction`).
 */
function frozenUnsigned(): WalletCoreUnsignedTx {
  return {
    version: 1,
    chainId: new Uint8Array(32).fill(0x11),
    nonce: 42n,
    sender: new Uint8Array(20).fill(0xaa),
    publicKey: null,
    gasLimit: 21_000n,
    maxFee: 20n,
    priorityFee: 2n,
    value: 100n,
    txKind: TX_KIND.Transfer,
    recipient: new Uint8Array(20).fill(0xbb),
    data: new Uint8Array(0),
  };
}

// ===========================================================================
// 1. Identité gelée
// ===========================================================================

describe("🔒 FROZEN — identity", () => {
  it("seed [0x55;32] → pubkey Ed25519 figée", async () => {
    const w = await restoreWallet(SEED, "testnet");
    expect(toHex(w.identity.publicKey).slice(2)).toBe(FROZEN_PUBKEY_HEX);
  });

  it("seed [0x55;32] → adresse hex figée", async () => {
    const w = await restoreWallet(SEED, "testnet");
    expect(w.identity.addressHex).toBe(FROZEN_ADDRESS_HEX);
  });

  it("seed [0x55;32] → bech32m mainnet figée", async () => {
    const w = await restoreWallet(SEED, "mainnet");
    expect(w.identity.addressBech32).toBe(FROZEN_ADDRESS_MAINNET);
  });

  it("seed [0x55;32] → bech32m testnet figée", async () => {
    const w = await restoreWallet(SEED, "testnet");
    expect(w.identity.addressBech32).toBe(FROZEN_ADDRESS_TESTNET);
  });

  it("adresse = 20 bytes, pubkey = 32 bytes", async () => {
    const w = await restoreWallet(SEED);
    expect(w.identity.address).toHaveLength(20);
    expect(w.identity.publicKey).toHaveLength(32);
  });
});

// ===========================================================================
// 2. Encodage unsigned gelé
// ===========================================================================

describe("🔒 FROZEN — unsigned encoding", () => {
  it("encodeUnsignedTransaction → 147 bytes, hex exact", () => {
    const bytes = encodeUnsignedTransaction(frozenUnsigned());
    expect(bytes).toHaveLength(147);
    expect(toHex(bytes)).toBe(FROZEN_UNSIGNED_HEX);
  });
});

// ===========================================================================
// 3. Hash de tx gelé
// ===========================================================================

describe("🔒 FROZEN — transaction hash", () => {
  it("Keccak256(TX_V1 || unsigned_bytes) = hash figé", () => {
    const signed = {
      ...frozenUnsigned(),
      signature: new Uint8Array(64),
    };
    expect(toHex(transactionHash(signed))).toBe(FROZEN_TX_HASH);
  });

  it("DOMAINS.TX_V1 est exactement 'SANGO/TX/V1'", () => {
    expect(new TextDecoder().decode(DOMAINS.TX_V1)).toBe("SANGO/TX/V1");
  });
});

// ===========================================================================
// 4. Signature + raw complet (snapshot)
// ===========================================================================

describe("🔒 FROZEN — signed bytes (snapshot)", () => {
  it("signature Ed25519 du payload figé est stable", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const unsignedBytes = encodeUnsignedTransaction(frozenUnsigned());
    const signature = await w.signDomain(DOMAINS.TX_V1, unsignedBytes);
    expect(signature).toHaveLength(64);

    // Snapshot : fige la signature Ed25519 exacte (déterministe).
    expect(toHex(signature)).toMatchSnapshot("ed25519-signature-hex");
  });

  it("raw complet (unsigned ‖ signature) est stable — 211 bytes", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const signer = walletAsSigner(w);
    const sangoSigner = new SangoTransactionSigner();

    const chainsTx: ChainsUnsignedTx = {
      family: "sango",
      networkId: "sango-devnet",
      payload: frozenUnsigned(),
      meta: {
        from: FROZEN_ADDRESS_HEX,
        to: "0x" + "bb".repeat(20),
        assetRef: {
          kind: "native",
          assetId: "sango",
          networkId: "sango-devnet",
        },
        amount: 100n,
      },
    };

    const signed = await sangoSigner.sign(chainsTx, signer, ACCOUNT);

    expect(signed.raw).toHaveLength(211);
    expect(signed.txHash).toBe(FROZEN_TX_HASH);

    // Snapshot : fige le raw complet byte-à-byte.
    expect(toHex(signed.raw)).toMatchSnapshot("signed-tx-raw-hex");
  });
});

// ===========================================================================
// 5. Cohérence pipeline complet
// ===========================================================================

describe("🔒 FROZEN — pipeline integrity", () => {
  it("le hash calculé localement == hash recalculé depuis raw", async () => {
    const w = await restoreWallet(SEED, "testnet");
    const signer = walletAsSigner(w);
    const sangoSigner = new SangoTransactionSigner();

    const chainsTx: ChainsUnsignedTx = {
      family: "sango",
      networkId: "sango-devnet",
      payload: frozenUnsigned(),
      meta: {
        from: FROZEN_ADDRESS_HEX,
        to: "0x" + "bb".repeat(20),
        assetRef: {
          kind: "native",
          assetId: "sango",
          networkId: "sango-devnet",
        },
        amount: 100n,
      },
    };

    const signed = await sangoSigner.sign(chainsTx, signer, ACCOUNT);

    // Recalcule indépendamment : unsigned_bytes = raw[0..147],
    // signature = raw[147..211], hash = Keccak256(TX_V1 || unsigned_bytes).
    const unsignedBytes = signed.raw.slice(0, 147);
    const signatureBytes = signed.raw.slice(147);

    expect(unsignedBytes).toHaveLength(147);
    expect(signatureBytes).toHaveLength(64);

    const recomputed = transactionHash({
      ...frozenUnsigned(),
      signature: signatureBytes,
    });
    expect(toHex(recomputed)).toBe(signed.txHash);
  });
});
