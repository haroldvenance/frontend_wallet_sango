import { asPublicKey } from "../../types/address";
import { asAddress } from "../../types/address";
import { describe, expect, it, vi } from "vitest";
import { SangoTransactionBuilder } from "../transaction-builder";
import { SANGO_CHAIN_ID_HEX } from "../config";
import { mockRpc } from "./_helpers";
import type { SendParams } from "../../capabilities/transaction-builder";
import type { Address } from "../../types/address";
import type { AssetRef } from "../../types/asset";

const SENDER = asAddress("aa".repeat(20));
const TO = asAddress("bb".repeat(20));
const VALIDATOR = asAddress("dd".repeat(20));
const NATIVE: AssetRef = {
  kind: "native",
  assetId: "sango",
  networkId: "sango-devnet",
};

const PUBKEY_HEX = asPublicKey("cc".repeat(32));

function makeBuilder(rpc = mockRpc()): SangoTransactionBuilder {
  return new SangoTransactionBuilder(
    rpc,
    "sango-devnet",
    SANGO_CHAIN_ID_HEX,
    "testnet",
  );
}

/** RPC standard : compte avec nonce 7, pubkey déclarée, baseFee 100. */
function rpcWithAccount(publicKey: string | null = PUBKEY_HEX) {
  return mockRpc({
    getAccount: vi.fn(async () => ({
      address: SENDER,
      publicKey,
      balance: "1000000000000",
      nonce: 7,
    })),
    getBaseFee: vi.fn(async () => "100"),
  });
}

// --- Transfert (V0.1) ------------------------------------------------------

describe("SangoTransactionBuilder — transfer", () => {
  it("builds a transfer using nonce/baseFee from RPC", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      { kind: "transfer", to: TO, assetRef: NATIVE, amount: 1000n },
      SENDER,
    );

    expect(tx.family).toBe("sango");
    const p = tx.payload as Record<string, unknown>;
    expect(p.nonce).toBe(7n);
    expect(p.value).toBe(1000n);
    expect(p.maxFee).toBe(200n);
    expect(p.gasLimit).toBe(21_000n);
    expect(p.txKind).toBe(0x01);
    expect((p.recipient as Uint8Array).length).toBe(20);
    expect(tx.meta.from).toBe(SENDER);
    expect(tx.meta.to).toBe(TO);
    expect(tx.meta.amount).toBe(1000n);
  });

  it("passes publicKey=null for ghost accounts", async () => {
    const b = makeBuilder(rpcWithAccount(null));
    const tx = await b.build(
      { kind: "transfer", to: TO, assetRef: NATIVE, amount: 1n },
      SENDER,
    );
    expect((tx.payload as Record<string, unknown>).publicKey).toBeNull();
  });

  it("accepts bech32 for `to`", async () => {
    const b = makeBuilder(rpcWithAccount());
    // Test défensif : le builder SANGO sait décoder bech32 (path
    // historique), mais SendParams.to est typé Address (`0x…`).
    // Cast pour vérifier que le path runtime fonctionne toujours.
    const bech32To = "tsango1qg53upurn4c45nrchpv9gjdhudn65qdtv3xlde" as unknown as Address;
    const tx = await b.build(
      { kind: "transfer", to: bech32To, assetRef: NATIVE, amount: 1n },
      SENDER,
    );
    const recipient = (tx.payload as Record<string, unknown>).recipient as Uint8Array;
    let hex = "";
    for (const byte of recipient) hex += byte.toString(16).padStart(2, "0");
    expect(hex).toBe("02291e07839d715a4c78b8585449b7e367aa01ab");
  });

  it("forwards memo as data", async () => {
    const b = makeBuilder(rpcWithAccount());
    const memo = new Uint8Array([1, 2, 3]);
    const tx = await b.build(
      { kind: "transfer", to: TO, assetRef: NATIVE, amount: 1n, memo },
      SENDER,
    );
    expect((tx.payload as Record<string, unknown>).data).toEqual(memo);
  });
});

// --- Validation ------------------------------------------------------------

describe("SangoTransactionBuilder — validation", () => {
  it("rejects token assetRef", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        {
          kind: "transfer",
          to: TO,
          assetRef: { kind: "token", networkId: "sango-devnet", contract: "0x" },
          amount: 1n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/native SANGO/);
  });

  it("rejects mismatched network", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        {
          kind: "transfer",
          to: TO,
          assetRef: { kind: "native", assetId: "sango", networkId: "sango-testnet" },
          amount: 1n,
        },
        SENDER,
      ),
    ).rejects.toThrow(/network mismatch/);
  });

  it("rejects commissionBps out of range (registerValidator)", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        {
          kind: "registerValidator",
          commissionBps: 1_001,
          selfStake: 1_000_000n,
          assetRef: NATIVE,
        },
        SENDER,
      ),
    ).rejects.toThrow(/commissionBps/);
  });

  it("rejects newCommissionBps negative (updateCommission)", async () => {
    const b = makeBuilder();
    await expect(
      b.build(
        { kind: "updateCommission", newCommissionBps: -1, assetRef: NATIVE },
        SENDER,
      ),
    ).rejects.toThrow(/newCommissionBps/);
  });
});

// --- Staking : self-stake --------------------------------------------------

describe("SangoTransactionBuilder — bond / unbond", () => {
  it("bond → txKind 0x04, value=amount, no recipient, gas=50_000", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      { kind: "bond", assetRef: NATIVE, amount: 1_000_000n },
      SENDER,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x04);
    expect(p.value).toBe(1_000_000n);
    expect(p.recipient).toBeNull();
    expect(p.gasLimit).toBe(50_000n);
    // Meta : pas de `to`, amount présent.
    expect(tx.meta.to).toBeUndefined();
    expect(tx.meta.amount).toBe(1_000_000n);
  });

  it("unbond → txKind 0x05, value=amount, no recipient, gas=50_000", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      { kind: "unbond", assetRef: NATIVE, amount: 5_000n },
      SENDER,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x05);
    expect(p.value).toBe(5_000n);
    expect(p.recipient).toBeNull();
    expect(p.gasLimit).toBe(50_000n);
  });
});

// --- Staking : délégation --------------------------------------------------

describe("SangoTransactionBuilder — delegate / undelegate", () => {
  it("delegate → txKind 0x06, recipient=validator, gas=300_000", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      {
        kind: "delegate",
        validator: VALIDATOR,
        assetRef: NATIVE,
        amount: 42_000n,
      },
      SENDER,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x06);
    expect(p.value).toBe(42_000n);
    expect((p.recipient as Uint8Array).length).toBe(20);
    expect(p.gasLimit).toBe(300_000n);
    expect(tx.meta.to).toBe(VALIDATOR);
    expect(tx.meta.amount).toBe(42_000n);
  });

  it("undelegate → txKind 0x07, recipient=validator, gas=300_000", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      {
        kind: "undelegate",
        validator: VALIDATOR,
        assetRef: NATIVE,
        amount: 10n,
      },
      SENDER,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x07);
    expect(p.value).toBe(10n);
    expect(p.gasLimit).toBe(300_000n);
  });
});

// --- Staking : claim -------------------------------------------------------

describe("SangoTransactionBuilder — claimRewards", () => {
  it("claimRewards → txKind 0x08, value=0n, recipient=validator, gas=40_000", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      { kind: "claimRewards", validator: VALIDATOR, assetRef: NATIVE },
      SENDER,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x08);
    expect(p.value).toBe(0n);
    expect((p.recipient as Uint8Array).length).toBe(20);
    expect(p.gasLimit).toBe(40_000n);
    expect(tx.meta.to).toBe(VALIDATOR);
    expect(tx.meta.amount).toBe(0n);
  });
});

// --- Staking : validateur --------------------------------------------------

describe("SangoTransactionBuilder — registerValidator", () => {
  it("encode commissionBps en u32 BE dans data", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      {
        kind: "registerValidator",
        commissionBps: 700,
        selfStake: 1_000_000_000_000n,
        assetRef: NATIVE,
      },
      SENDER,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x09);
    expect(p.value).toBe(1_000_000_000_000n);
    expect(p.recipient).toBeNull();
    expect(p.gasLimit).toBe(200_000n);
    // 700 = 0x000002BC
    expect(p.data).toEqual(new Uint8Array([0x00, 0x00, 0x02, 0xbc]));
    expect(tx.meta.to).toBeUndefined();
    expect(tx.meta.amount).toBe(1_000_000_000_000n);
  });
});

describe("SangoTransactionBuilder — updateCommission", () => {
  it("encode newCommissionBps en u32 BE dans data", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build(
      { kind: "updateCommission", newCommissionBps: 500, assetRef: NATIVE },
      SENDER,
    );
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x0a);
    expect(p.value).toBe(0n);
    expect(p.recipient).toBeNull();
    expect(p.gasLimit).toBe(30_000n);
    // 500 = 0x000001F4
    expect(p.data).toEqual(new Uint8Array([0x00, 0x00, 0x01, 0xf4]));
  });
});

describe("SangoTransactionBuilder — unjail", () => {
  it("unjail → txKind 0x0b, value=0n, no recipient, gas=30_000", async () => {
    const b = makeBuilder(rpcWithAccount());
    const tx = await b.build({ kind: "unjail", assetRef: NATIVE }, SENDER);
    const p = tx.payload as Record<string, unknown>;
    expect(p.txKind).toBe(0x0b);
    expect(p.value).toBe(0n);
    expect(p.recipient).toBeNull();
    expect(p.gasLimit).toBe(30_000n);
    expect(tx.meta.to).toBeUndefined();
    expect(tx.meta.amount).toBe(0n);
  });
});

// --- Cohérence pipeline ---------------------------------------------------

describe("SangoTransactionBuilder — pipeline cohérent", () => {
  it("tous les variants utilisent le même nonce + maxFee", async () => {
    const rpc = rpcWithAccount();
    const b = makeBuilder(rpc);

    const variants: SendParams[] = [
      { kind: "transfer", to: TO, assetRef: NATIVE, amount: 1n },
      { kind: "bond", assetRef: NATIVE, amount: 1n },
      { kind: "unbond", assetRef: NATIVE, amount: 1n },
      { kind: "delegate", validator: VALIDATOR, assetRef: NATIVE, amount: 1n },
      { kind: "undelegate", validator: VALIDATOR, assetRef: NATIVE, amount: 1n },
      { kind: "claimRewards", validator: VALIDATOR, assetRef: NATIVE },
      { kind: "registerValidator", commissionBps: 500, selfStake: 1n, assetRef: NATIVE },
      { kind: "updateCommission", newCommissionBps: 500, assetRef: NATIVE },
      { kind: "unjail", assetRef: NATIVE },
    ];

    for (const params of variants) {
      const tx = await b.build(params, SENDER);
      const p = tx.payload as Record<string, unknown>;
      expect(p.nonce).toBe(7n);
      expect(p.maxFee).toBe(200n);
      expect((p.chainId as Uint8Array).length).toBe(32);
      expect((p.sender as Uint8Array).length).toBe(20);
    }
  });
});
