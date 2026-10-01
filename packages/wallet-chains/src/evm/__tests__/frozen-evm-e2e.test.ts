import { describe, expect, it, vi } from "vitest";
import { keccak256 } from "viem";

import {
  Bip39Wallet,
  deriveEthereumAddress,
  secp256k1KeypairFromPrivateKey,
  secp256k1Verify,
} from "@sango/wallet-core";

import { EvmTransactionBuilder } from "../transaction-builder";
import { EvmTransactionSigner } from "../transaction-signer";
import {
  encodeEip1559Digest,
  type Eip1559UnsignedFields,
} from "../eip1559-codec";
import type { AccountRef } from "../../types/account";
import type { AssetRef } from "../../types/asset";
import type { Signer } from "../../types/signer";

/**
 * 🔒 TEST DE GEL EVM end-to-end (patch 5.f)
 *
 * Fige le pipeline EVM complet byte-à-byte :
 *   mnemonic BIP-39
 *     → Bip39Wallet
 *       → adresse Ethereum
 *         → EvmTransactionBuilder (EIP-1559)
 *           → EvmTransactionSigner (secp256k1 recoverable)
 *             → RLP signé
 *               → txHash canonique
 *
 * Golden vectors Hardhat/Anvil (publics, standards) :
 *   mnemonic    : "test test … junk"
 *   privkey #0  : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 *   adresse #0  : 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
 *   adresse #1  : 0x70997970c51812dc3a010c7d01b50e0d17dc79c8
 *
 * ⚠️ Toute divergence doit être traitée comme un BUG, pas comme un
 *    snapshot à mettre à jour.
 */

const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";
const HARDHAT_ADDRESS_0 = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const HARDHAT_ADDRESS_1 = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const HARDHAT_PRIVKEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const SEPOLIA_CHAIN_ID = 11_155_111;

const EVM_ACCOUNT: AccountRef = {
  family: "evm",
  accountIndex: 0,
  networkId: "ethereum-sepolia",
};

const NATIVE_ETH: AssetRef = {
  kind: "native",
  assetId: "eth",
  networkId: "ethereum-sepolia",
};

/**
 * Adaptateur Bip39Wallet → Signer, INLINÉ pour respecter le rootDir
 * (wallet-chains ne peut pas importer wallet-session).
 * Miroir exact de `signerFromBip39Wallet` (wallet-session/signer.ts).
 */
function inlineBip39Signer(wallet: Bip39Wallet): Signer {
  return {
    async getPublicKey(account: AccountRef): Promise<Uint8Array> {
      if (account.family !== "evm") {
        throw new Error(`inlineBip39Signer: family ${account.family} not supported`);
      }
      return wallet.getIdentity(account.accountIndex).publicKeyUncompressed;
    },
    async signDomain(
      domain: Uint8Array,
      payload: Uint8Array,
      account: AccountRef,
    ): Promise<Uint8Array> {
      return wallet.signDomain(domain, payload, account.accountIndex);
    },
    async signDigestRecoverable(
      digest: Uint8Array,
      account: AccountRef,
    ): Promise<{ compact: Uint8Array; recovery: 0 | 1 }> {
      return wallet.signDigestRecoverable(digest, account.accountIndex);
    },
  };
}

/** Mock RPC : valeurs figées pour déterminisme total. */
function frozenRpc() {
  return {
    getChainId: vi.fn(async () => SEPOLIA_CHAIN_ID),
    getBalance: vi.fn(async () => 1_000_000_000_000_000_000n),
    getTransactionCount: vi.fn(async () => 0),
    estimateGas: vi.fn(async () => 21_000n),
    getBaseFeePerGas: vi.fn(async () => 10_000_000_000n), // 10 gwei
    getMaxPriorityFeePerGas: vi.fn(async () => 1_000_000_000n), // 1 gwei
    sendRawTransaction: vi.fn(
      async () => "0x" + "00".repeat(32) as `0x${string}`,
    ),
    // E1.6 : mock eth_call (non utilisé par les tests de gel, mais
    // requis par l'interface EvmRpc).
    call: vi.fn(async () => "0x"),
  };
}

function buildFrozenUnsigned() {
  const builder = new EvmTransactionBuilder(
    frozenRpc(),
    "ethereum-sepolia",
    SEPOLIA_CHAIN_ID,
  );
  return builder.build(
    {
      kind: "transfer",
      to: HARDHAT_ADDRESS_1 as `0x${string}`,
      assetRef: NATIVE_ETH,
      amount: 1_000_000_000_000_000_000n, // 1 ETH
    },
    HARDHAT_ADDRESS_0 as `0x${string}`,
  );
}

// ── Helpers ─────────────────────────────────────────────────

function hexOf(u: Uint8Array): string {
  return "0x" + Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// ── Tests ───────────────────────────────────────────────────

describe("🔒 FROZEN — EVM identity (mnemonic → address)", () => {
  it("Hardhat mnemonic → Anvil/0", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    expect(w.defaultAddress).toBe(HARDHAT_ADDRESS_0);
  });

  it("Hardhat mnemonic → Anvil/1", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    expect(w.getIdentity(1).addressHex).toBe(HARDHAT_ADDRESS_1);
  });

  it("pubkeyUncompressed → keccak256 → adresse Anvil/0", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const id = w.getIdentity(0);
    const addr = deriveEthereumAddress(id.publicKeyUncompressed);
    expect(hexOf(addr)).toBe(HARDHAT_ADDRESS_0);
  });
});

describe("🔒 FROZEN — EVM pipeline (build → sign → bytes)", () => {
  it("produit une tx signée byte-stable (snapshot)", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const signer = inlineBip39Signer(w);
    const unsigned = await buildFrozenUnsigned();
    const signed = await new EvmTransactionSigner().sign(
      unsigned,
      signer,
      EVM_ACCOUNT,
    );

    // 1. Préfixe EIP-1559.
    expect(signed.raw[0]).toBe(0x02);

    // 2. txHash = keccak256(raw).
    expect(signed.txHash).toBe(keccak256(signed.raw));

    // 3. Snapshots byte-à-byte.
    expect(hexOf(signed.raw)).toMatchSnapshot("signed-raw-hex");
    expect(signed.txHash).toMatchSnapshot("signed-tx-hash");
  });

  it("est déterministe (RFC 6979)", async () => {
    const buildAndSign = async () => {
      const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
      const unsigned = await buildFrozenUnsigned();
      return new EvmTransactionSigner().sign(
        unsigned,
        inlineBip39Signer(w),
        EVM_ACCOUNT,
      );
    };
    const a = await buildAndSign();
    const b = await buildAndSign();
    expect(a.raw).toEqual(b.raw);
    expect(a.txHash).toBe(b.txHash);
  });

  it("la signature vérifie contre la clé publique Anvil/0 (golden vector)", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const signer = inlineBip39Signer(w);
    const unsigned = await buildFrozenUnsigned();

    // Capture la signature recoverable produite par le signer.
    let compact: Uint8Array | null = null;
    let recovery: 0 | 1 | null = null;
    const spySigner: Signer = {
      ...signer,
      signDigestRecoverable: async (digest, account) => {
        const r = await signer.signDigestRecoverable!(digest, account);
        compact = r.compact;
        recovery = r.recovery;
        return r;
      },
    };
    await new EvmTransactionSigner().sign(unsigned, spySigner, EVM_ACCOUNT);

    expect(compact).not.toBeNull();
    expect(recovery).not.toBeNull();

    // Reconstruit le digest que le signer a effectivement signé.
    const fields = unsigned.payload as Eip1559UnsignedFields;
    const digest = new Uint8Array(
      encodeEip1559Digest(fields)
        .slice(2)
        .match(/.{2}/g)!
        .map((h) => Number.parseInt(h, 16)),
    );

    // Vérifie la signature contre la clé publique d'Anvil/0.
    // C'est ce qu'un nœud EVM ferait pour accepter la tx.
    const kp = secp256k1KeypairFromPrivateKey(hexToBytes(HARDHAT_PRIVKEY_0));
    expect(secp256k1Verify(kp.publicKeyCompressed, digest, compact!)).toBe(true);
    expect([0, 1]).toContain(recovery);
  });

  it("txHash matche la reconstruction directe du codec", async () => {
    const w = await Bip39Wallet.fromMnemonic(HARDHAT_MNEMONIC);
    const signer = inlineBip39Signer(w);
    const unsigned = await buildFrozenUnsigned();
    const signed = await new EvmTransactionSigner().sign(
      unsigned,
      signer,
      EVM_ACCOUNT,
    );

    // Reconstruit le digest (hex), re-signe, reconstruit le txHash.
    const fields = unsigned.payload as Eip1559UnsignedFields;
    const digestHex = encodeEip1559Digest(fields);
    const digestBytes = new Uint8Array(
      digestHex.slice(2).match(/.{2}/g)!.map((h) => Number.parseInt(h, 16)),
    );
    const sig = await signer.signDigestRecoverable!(digestBytes, EVM_ACCOUNT);

    const r = "0x" + hexOf(sig.compact.slice(0, 32)).slice(2);
    const s = "0x" + hexOf(sig.compact.slice(32)).slice(2);
    const { computeEip1559TxHash } = await import("../eip1559-codec");
    const ref = computeEip1559TxHash(fields, {
      r: r as `0x${string}`,
      s: s as `0x${string}`,
      yParity: sig.recovery,
    });
    expect(signed.txHash).toBe(ref);
  });
});
