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

describe("changeKeyringPassword — Phase 11.2", () => {
  beforeEach(clearKeyring);
  afterEach(clearKeyring);

  it("happy path : ré-encrypte toutes les entries, préserve les metadata", async () => {
    await seedKeyring();
    const before = await readAll();

    const result = await changeKeyringPassword({
      currentPassword: OLD_PWD,
      newPassword: NEW_PWD,
    });
    expect(result.status).toBe("ok");

    const after = await readAll();
    expect(after).toHaveLength(before.length);

    // Metadata préservées.
    const byId = new Map(after.map((e) => [e.id, e]));
    expect(byId.get("0x01")?.label).toBe("V1");
    expect(byId.get("0x01")?.format).toBe("sango-legacy");
    expect(byId.get("0x02")?.label).toBe("V2");
    expect(byId.get("0x02")?.networkId).toBe("ethereum-sepolia");

    // Chaque entry déchiffrable avec le NOUVEAU mot de passe.
    for (const entry of after) {
      if (entry.stored.version === 1) {
        const { secret } = await decryptWalletSecret(entry.stored, NEW_PWD);
        expect(secret.length).toBe(32);
        expect(Array.from(secret)).toEqual(Array.from(new Uint8Array(32).fill(0xab)));
      } else if (entry.stored.version === 2) {
        const { seed } = await decryptBip39Secret(entry.stored, NEW_PWD);
        expect(seed.length).toBe(64);
        expect(Array.from(seed)).toEqual(Array.from(new Uint8Array(64).fill(0xcd)));
      }
    }

    // Salt + IV régénérés (par hygiène AES-GCM).
    for (const entry of after) {
      const ref = before.find((b) => b.id === entry.id)!;
      expect(Array.from(entry.stored.salt)).not.toEqual(Array.from(ref.stored.salt));
      expect(Array.from(entry.stored.iv)).not.toEqual(Array.from(ref.stored.iv));
    }
  });

  it("mauvais mot de passe courant : aucune écriture, ancien keyring intact", async () => {
    await seedKeyring();
    const before = await readAll();

    const result = await changeKeyringPassword({
      currentPassword: "WRONG-PASSWORD",
      newPassword: NEW_PWD,
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("wrong-current-password");
    }

    const after = await readAll();
    expect(after).toHaveLength(before.length);
    // Ciphertexts identiques → rien n'a bougé.
    for (let i = 0; i < after.length; i++) {
      const b = before.find((x) => x.id === after[i]!.id)!;
      expect(Array.from(after[i]!.stored.ciphertext)).toEqual(
        Array.from(b.stored.ciphertext),
      );
    }

    // L'ancien mot de passe marche toujours.
    for (const entry of after) {
      if (entry.stored.version === 1) {
        await expect(
          decryptWalletSecret(entry.stored, OLD_PWD),
        ).resolves.toBeDefined();
      } else if (entry.stored.version === 2) {
        await expect(
          decryptBip39Secret(entry.stored, OLD_PWD),
        ).resolves.toBeDefined();
      }
    }
  });

  it("rejette un nouveau mot de passe identique", async () => {
    await seedKeyring();
    const result = await changeKeyringPassword({
      currentPassword: OLD_PWD,
      newPassword: OLD_PWD,
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
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("invalid-new-password");
    }
  });

  it("rejette un keyring vide", async () => {
    const result = await changeKeyringPassword({
      currentPassword: OLD_PWD,
      newPassword: NEW_PWD,
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("empty-keyring");
    }
  });
});
