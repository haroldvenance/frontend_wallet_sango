import { describe, expect, it } from "vitest";

import { SangoRpcClient } from "./client";
import type { Hex } from "./types";
import {
  encodeTransaction,
  restoreWallet,
  transactionHash,
  TX_KIND,
  type UnsignedTransaction,
} from "@sango/wallet-core";

/**
 * Test E2E contre un devnet local.
 *
 * ⚠️ Skippé par défaut. Pour l'exécuter :
 *
 *   SANGO_DEVNET_URL=http://127.0.0.1:8545 \
 *   SANGO_DEVNET_SEED="55,55,...,55" \
 *   pnpm --filter @sango/rpc-client exec vitest run src/e2e.devnet.test.ts
 *
 * Le seed doit être celui d'un compte présent dans `allocations[]` du
 * Genesis du devnet (`examples/devnet.json`).
 */

const URL = process.env.SANGO_DEVNET_URL;
const SEED_HEX = process.env.SANGO_DEVNET_SEED;

const hasDevnet = Boolean(URL && SEED_HEX);

function hex(s: string): Hex {
  return (`0x${s}`) as Hex;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function seedFromEnv(s: string): Uint8Array {
  const parts = s.split(",").map((p) => Number.parseInt(p.trim(), 10));
  if (parts.length !== 32) {
    throw new Error(`SANGO_DEVNET_SEED must be 32 bytes, got ${parts.length}`);
  }
  return new Uint8Array(parts);
}

describe.skipIf(!hasDevnet)("E2E — devnet", () => {
  const endpoint = URL ?? "http://127.0.0.1:8545";
  const seed = hasDevnet ? seedFromEnv(SEED_HEX!) : new Uint8Array(32);

  it("chainId / chainInfo are consistent", async () => {
    const client = new SangoRpcClient(endpoint);
    const chainId = await client.getChainId();
    const info = await client.getChainInfo();
    expect(info.chainId).toBe(chainId);
    expect(info.protocolVersion).toBe(1);
  });

  it("getBlockNumber advances", async () => {
    const client = new SangoRpcClient(endpoint);
    const n1 = await client.getBlockNumber();
    expect(n1).not.toBeNull();
    await new Promise((r) => setTimeout(r, 1_500));
    const n2 = await client.getBlockNumber();
    expect(n2).not.toBeNull();
    expect(n2!).toBeGreaterThan(n1!);
  });

  it("alice has a non-zero balance in genesis", async () => {
    const client = new SangoRpcClient(endpoint);
    const wallet = await restoreWallet(seed, "testnet");
    const acc = await client.getAccount(wallet.identity.addressHex as Hex);
    expect(acc).not.toBeNull();
    expect(BigInt(acc!.balance)).toBeGreaterThan(0n);
    console.log(`[e2e] alice address  = ${wallet.identity.addressHex}`);
    console.log(`[e2e] alice bech32   = ${wallet.identity.addressBech32}`);
    console.log(`[e2e] alice balance  = ${acc!.balance} base units`);
    console.log(`[e2e] alice nonce    = ${acc!.nonce}`);
    console.log(`[e2e] alice pubKey   = ${acc!.publicKey ?? "null (ghost)"}`);
  });

  it("send a transfer and check the tx hash matches locally", async () => {
    const client = new SangoRpcClient(endpoint);
    const wallet = await restoreWallet(seed, "testnet");

    const chainIdHex = await client.getChainId();
    const chainIdBytes = new Uint8Array(
      chainIdHex.slice(2).match(/.{2}/g)!.map((h) => Number.parseInt(h, 16)),
    );
    const acc = await client.getAccount(wallet.identity.addressHex as Hex);
    if (!acc) throw new Error("alice not found in genesis");

    const recipient = new Uint8Array(20).fill(0x77);

    // ⚠️ Bootstrap : si le compte n'a pas encore de publicKey enregistrée,
    // on DOIT la déclarer dans la première tx (champ Some). Sinon None.
    const publicKey = acc.publicKey === null ? wallet.identity.publicKey : null;

    const unsigned: UnsignedTransaction = {
      version: 1,
      chainId: chainIdBytes,
      nonce: BigInt(acc.nonce),
      sender: wallet.identity.address,
      publicKey,
      gasLimit: 21_000n,
      maxFee: 1_000n,       // confortable (cf. backend)
      priorityFee: 0n,
      value: 1_000_000n,
      txKind: TX_KIND.Transfer,
      recipient,
      data: new Uint8Array(0),
    };

    const signed = await wallet.signTransaction(unsigned);
    const expectedHash = "0x" + bytesToHex(transactionHash(signed));
    const fullHex = ("0x" + bytesToHex(encodeTransaction(signed))) as Hex;

    console.log(`[e2e] sending tx, nonce=${acc.nonce}, expected hash=${expectedHash}`);
    const rpcHash = await client.sendTransaction(fullHex);
    console.log(`[e2e] rpc returned hash = ${rpcHash}`);
    expect(rpcHash).toBe(expectedHash);

    await new Promise((r) => setTimeout(r, 2_500));
    const after = await client.getAccount(wallet.identity.addressHex as Hex);
    console.log(`[e2e] nonce after inclusion = ${after!.nonce}`);
    expect(after!.nonce).toBe(acc.nonce + 1);
  });
});
