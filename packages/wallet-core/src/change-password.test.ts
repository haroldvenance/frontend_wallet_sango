import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { changeKeyringPassword } from "./change-password";
import { Keyring } from "./keyring";
import {
  decryptBip39Secret,
  decryptWalletSecret,
  encryptBip39Secret,
  encryptWalletSecret,
} from "./storage";

const OLD_PWD = "old-password-1";
const NEW_PWD = "new-password-2";

async function clearKeyring(): Promise<void> {
  const kr = await Keyring.open();
  await kr.clear();
  kr.close();
}

async function seedKeyring(): Promise<void> {
  const v1Stored = await encryptWalletSecret({
    secret: new Uint8Array(32).fill(0xab),
    address: new Uint8Array(20).fill(0x01),
    network: "testnet",
    password: OLD_PWD,
  });
  const v2Stored = await encryptBip39Secret({
    seed: new Uint8Array(64).fill(0xcd),
    address: new Uint8Array(20).fill(0x02),
    password: OLD_PWD,
  });
  const kr = await Keyring.open();
  await kr.put({
    id: "0x01",
    label: "V1",
    format: "sango-legacy",
    networkId: "sango-devnet",
    stored: v1Stored,
    createdAt: 1,
  });
  await kr.put({
    id: "0x02",
    label: "V2",
    format: "bip39",
    networkId: "ethereum-sepolia",
    stored: v2Stored,
    createdAt: 2,
  });
  kr.close();
}

async function readAll() {
  const kr = await Keyring.open();
  const list = await kr.list();
  kr.close();
  return list;
}

describe("changeKeyringPassword — Phase 11.2 (per-entry)", () => {
  beforeEach(clearKeyring);
  afterEach(clearKeyring);

  it("happy path : ne ré-encrypte que l'entrée ciblée (V2)", async () => {
    await seedKeyring();
    const before = await readAll();

    const result = await changeKeyringPassword({
      currentPassword: OLD_PWD,
      newPassword: NEW_PWD,
      targetEntryId: "0x02",
    });
    expect(result.status).toBe("ok");

    const after = await readAll();
    expect(after).toHaveLength(2);

    const v1After = after.find((e) => e.id === "0x01")!;
    const v2After = after.find((e) => e.id === "0x02")!;
    const v1Before = before.find((e) => e.id === "0x01")!;
    const v2Before = before.find((e) => e.id === "0x02")!;

    // V1 (non ciblé) : intact.
    expect(Array.from(v1After.stored.ciphertext)).toEqual(
      Array.from(v1Before.stored.ciphertext),
    );
    expect(v1After.stored.version).toBe(1);
    await expect(
      decryptWalletSecret(v1After.stored as never, OLD_PWD),
    ).resolves.toBeDefined();

    // V2 (ciblé) : ré-encrypté avec le nouveau pwd.
    const { seed } = await decryptBip39Secret(v2After.stored as never, NEW_PWD);
    expect(Array.from(seed)).toEqual(Array.from(new Uint8Array(64).fill(0xcd)));

    // Salt + IV régénérés sur la V2 ciblée, pas sur la V1.
    expect(Array.from(v2After.stored.salt)).not.toEqual(
      Array.from(v2Before.stored.salt),
    );
    expect(Array.from(v2After.stored.iv)).not.toEqual(
      Array.from(v2Before.stored.iv),
    );
    expect(Array.from(v1After.stored.salt)).toEqual(
      Array.from(v1Before.stored.salt),
    );
  });

  it("mauvais mot de passe : aucune écriture, keyring intact", async () => {
    await seedKeyring();
    const before = await readAll();

    const result = await changeKeyringPassword({
      currentPassword: "WRONG-PASSWORD",
      newPassword: NEW_PWD,
      targetEntryId: "0x02",
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("wrong-current-password");
    }

    const after = await readAll();
    for (let i = 0; i < after.length; i++) {
      const b = before.find((x) => x.id === after[i]!.id)!;
      expect(Array.from(after[i]!.stored.ciphertext)).toEqual(
        Array.from(b.stored.ciphertext),
      );
    }
  });

  it("entry cible introuvable → entry-not-found", async () => {
    await seedKeyring();
    const result = await changeKeyringPassword({
      currentPassword: OLD_PWD,
      newPassword: NEW_PWD,
      targetEntryId: "0x-does-not-exist",
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("entry-not-found");
    }
  });

  it("rejette un nouveau mot de passe identique", async () => {
    await seedKeyring();
    const result = await changeKeyringPassword({
      currentPassword: OLD_PWD,
      newPassword: OLD_PWD,
      targetEntryId: "0x02",
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("same-as-current");
    }
  });

  it("rejette un nouveau mot de passe trop court", async () => {
    await seedKeyring();
    const result = await changeKeyringPassword({
      currentPassword: OLD_PWD,
      newPassword: "short",
      targetEntryId: "0x02",
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("invalid-new-password");
    }
  });
});
