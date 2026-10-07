import {
  deriveBitcoinIdentity,
  mnemonicToSeedSync,
  secp256k1KeypairFromPrivateKey,
  secp256k1SignDigestDer,
} from "@sango/wallet-core";
import { describe, expect, it, vi } from "vitest";

import type { AccountRef } from "../../types/account";
import type { Signer } from "../../types/signer";
import type { UnsignedTransaction } from "../../types/tx";
import { BitcoinTransactionSigner } from "../transaction-signer";
import type { BitcoinUnsignedPayload } from "../transaction-builder";
import { BitcoinUtxoProvider } from "../utxo-provider";
import { BitcoinTransactionBuilder } from "../transaction-builder";
import type {
  BitcoinChangeAddress,
  BitcoinChangeAddressProvider,
} from "../change-address-provider";
import { BITCOIN_NATIVE_ASSET_ID } from "../constants";
import { mockBitcoinRpc, utxo } from "./_helpers";

/**
 * Adresses BIP-84 canoniques testnet (mnemonic "abandon…").
 * Cohérentes avec derivation-bitcoin.test.ts.
 */
const SENDER =
  "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl" as const;
const RECIPIENT =
  "tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97" as const;

const ACCOUNT: AccountRef = {
  family: "bitcoin",
  accountIndex: 0,
  networkId: "bitcoin-testnet",
};

const NATIVE_BTC = {
  kind: "native" as const,
  assetId: BITCOIN_NATIVE_ASSET_ID,
  networkId: "bitcoin-testnet",
};

function makeChangeProvider(): BitcoinChangeAddressProvider {
  return {
    getChangeAddress: vi.fn(
      async (): Promise<BitcoinChangeAddress> => ({
        address: "tb1q9u62588spffmq4dzjxsr5l297znf3z6j5p2688",
        script: new Uint8Array([0x00, 0x14, ...new Uint8Array(20)]),
        derivationIndex: 0,
      }),
    ),
    commit: vi.fn(),
    currentIndex: () => 0,
  };
}

function makeBuilder(utxoValues: bigint[]) {
  const rpc = mockBitcoinRpc({
    getUtxos: vi.fn(async () =>
      utxoValues.map((v, i) =>
        utxo({
          txid: String(i).repeat(64).slice(0, 64),
          value: v,
        }),
      ),
    ),
  });
  return new BitcoinTransactionBuilder(
    {
      utxoProvider: new BitcoinUtxoProvider(rpc),
      changeAddressProvider: makeChangeProvider(),
    },
    "bitcoin-testnet",
    "testnet",
  );
}

/**
 * 🔒 `@scure/btc-signer.finalizeIdx()` **valide réellement** la
 * signature contre le `witnessUtxo.script` (hash160 doit matcher le
 * pubkey, et le DER doit vérifier le digest BIP-143).
 *
 * On ne peut donc PAS mocker `signEcdsaDer` avec une signature
 * factice : on dérive la vraie identité Bitcoin depuis la mnemonic
 * BIP-84 canonique (mnemonic "abandon…"). L'adresse de réception
 * (`SENDER`) correspond exactement à cette identité — cohérent avec
 * `derivation-bitcoin.test.ts`.
 */
const BIP84_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";
const REAL_IDENTITY = deriveBitcoinIdentity(mnemonicToSeedSync(BIP84_MNEMONIC), {
  network: "testnet",
  change: 0,
  index: 0,
});

// Sanity : l'adresse dérivée est bien celle qu'on utilise comme SENDER.
if (REAL_IDENTITY.address !== SENDER) {
  throw new Error(
    `Test fixture mismatch: derived address "${REAL_IDENTITY.address}" ≠ SENDER "${SENDER}"`,
  );
}

/**
 * Signer réel — dérive la clé secp256k1 depuis la mnemonic, produit
 * une vraie signature DER. Le pipeline `finalizeIdx` valide.
 */
function makeRealSigner(overrides: Partial<Signer> = {}): Signer {
  const kp = secp256k1KeypairFromPrivateKey(REAL_IDENTITY.privateKey);
  return {
    getPublicKey: vi.fn(async () => REAL_IDENTITY.publicKeyCompressed),
    signDomain: vi.fn(async () => new Uint8Array(64)),
    signEcdsaDer: vi.fn(async (digest: Uint8Array) =>
      secp256k1SignDigestDer(kp, digest),
    ),
    ...overrides,
  };
}

describe("BitcoinTransactionSigner — happy path", () => {
  it("signe 1 input + finalise + extract", async () => {
    const builder = makeBuilder([100_000n]);
    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 5n,
      },
      SENDER,
    );

    const signer = makeRealSigner();
    const signed = await new BitcoinTransactionSigner().sign(
      unsigned,
      signer,
      ACCOUNT,
    );

    expect(signed.raw).toBeInstanceOf(Uint8Array);
    expect(signed.raw.length).toBeGreaterThan(0);
    expect(signed.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(signer.signEcdsaDer).toHaveBeenCalledTimes(1);
    expect(signer.getPublicKey).toHaveBeenCalledWith(ACCOUNT);
  });

  it("signe 2 inputs → 2 appels signEcdsaDer", async () => {
    const builder = makeBuilder([40_000n, 30_000n]);
    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 10n,
      },
      SENDER,
    );

    const signer = makeRealSigner();
    await new BitcoinTransactionSigner().sign(unsigned, signer, ACCOUNT);
    expect(signer.signEcdsaDer).toHaveBeenCalledTimes(2);
  });

  it("passe un digest 32 bytes à signEcdsaDer", async () => {
    const builder = makeBuilder([100_000n]);
    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 5n,
      },
      SENDER,
    );

    const signer = makeRealSigner();
    await new BitcoinTransactionSigner().sign(unsigned, signer, ACCOUNT);

    const call = (signer.signEcdsaDer as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect(call[0]).toBeInstanceOf(Uint8Array);
    expect((call[0] as Uint8Array).length).toBe(32);
    expect(call[1]).toBe(ACCOUNT);
  });

  it("txHash est déterminé par le contenu signé (identique sur 2 runs)", async () => {
    const builder = makeBuilder([100_000n]);
    const baseUnsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 5n,
      },
      SENDER,
    );

    // ⚠️ `Transaction` (@scure/btc-signer) est **mutable** : `sign()`
    //    finalise les inputs, donc le PSBT ne peut pas être signé 2×.
    //    On clone le payload avant chaque signature (API officielle :
    //    `tx.clone()`).
    const basePayload = baseUnsigned.payload as BitcoinUnsignedPayload;
    const unsigned1: typeof baseUnsigned = {
      ...baseUnsigned,
      payload: {
        ...basePayload,
        tx: basePayload.tx.clone(),
      },
    };
    const unsigned2: typeof baseUnsigned = {
      ...baseUnsigned,
      payload: {
        ...basePayload,
        tx: basePayload.tx.clone(),
      },
    };

    // Deux signers identiques → même signature → même txHash.
    const s1 = new BitcoinTransactionSigner();
    const s2 = new BitcoinTransactionSigner();
    const a = await s1.sign(unsigned1, makeRealSigner(), ACCOUNT);
    const b = await s2.sign(unsigned2, makeRealSigner(), ACCOUNT);
    expect(a.txHash).toBe(b.txHash);
  });
});

describe("BitcoinTransactionSigner — validations", () => {
  it("rejette une famille ≠ bitcoin", async () => {
    const unsigned: UnsignedTransaction = {
      family: "evm",
      networkId: "bitcoin-testnet",
      payload: {} as BitcoinUnsignedPayload,
      meta: {
        from: SENDER,
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 1n,
      },
    };
    await expect(
      new BitcoinTransactionSigner().sign(unsigned, makeRealSigner(), ACCOUNT),
    ).rejects.toThrow(/unexpected family "evm"/);
  });

  it("rejette un signer sans signEcdsaDer", async () => {
    const builder = makeBuilder([100_000n]);
    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 5n,
      },
      SENDER,
    );

    const signerSansDer: Signer = {
      getPublicKey: vi.fn(async () => new Uint8Array(33)),
      signDomain: vi.fn(async () => new Uint8Array(64)),
      // pas de signEcdsaDer
    };

    await expect(
      new BitcoinTransactionSigner().sign(unsigned, signerSansDer, ACCOUNT),
    ).rejects.toThrow(/signEcdsaDer/);
  });

  it("rejette un pubkey ≠ 33 bytes (signer EVM par erreur)", async () => {
    const builder = makeBuilder([100_000n]);
    const unsigned = await builder.build(
      {
        kind: "transferBitcoin",
        to: RECIPIENT,
        assetRef: NATIVE_BTC,
        amount: 50_000n,
        feeRate: 5n,
      },
      SENDER,
    );

    const signerEVM = makeRealSigner({
      getPublicKey: vi.fn(async () => new Uint8Array(65).fill(0x04)),
    });

    await expect(
      new BitcoinTransactionSigner().sign(unsigned, signerEVM, ACCOUNT),
    ).rejects.toThrow(/33-byte compressed pubkey/);
  });
});
