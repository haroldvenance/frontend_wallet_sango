import { asAddress } from "@sango/wallet-chains";
import { describe, expect, it } from "vitest";
import {
  KeyringBackedAccountList,
  type StoredAccountSummary,
} from "../accounts";
import { FakeKeyring, fakeEntry } from "./_helpers";
import type { AccountRef } from "@sango/wallet-chains";

const REF: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

describe("KeyringBackedAccountList", () => {
  it("list() returns empty when no wallet persisted", async () => {
    const a = new KeyringBackedAccountList(new FakeKeyring());
    expect(await a.list()).toEqual([]);
  });

  it("persist() then list() returns the summary", async () => {
    const a = new KeyringBackedAccountList(new FakeKeyring());
    await a.persist(fakeEntry(asAddress("aa".repeat(20)), "Alice"));
    const summaries: readonly StoredAccountSummary[] = await a.list();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.id).toBe(asAddress("aa".repeat(20)));
    expect(summaries[0]!.label).toBe("Alice");
    expect(summaries[0]!.network).toBe("testnet");
  });

  it("list() sorts by createdAt ascending", async () => {
    const a = new KeyringBackedAccountList(new FakeKeyring());
    await a.persist(fakeEntry(asAddress("aa".repeat(20)), "Z", 3000));
    await a.persist(fakeEntry(asAddress("bb".repeat(20)), "A", 1000));
    await a.persist(fakeEntry(asAddress("cc".repeat(20)), "M", 2000));
    const ids = (await a.list()).map((s) => s.label);
    expect(ids).toEqual(["A", "M", "Z"]);
  });

  it("forget() removes the wallet", async () => {
    const a = new KeyringBackedAccountList(new FakeKeyring());
    const id = asAddress("aa".repeat(20));
    await a.persist(fakeEntry(id));
    await a.forget(id);
    expect(await a.list()).toEqual([]);
  });

  it("forget() on unknown id is a no-op", async () => {
    const a = new KeyringBackedAccountList(new FakeKeyring());
    await expect(a.forget("0xdead")).resolves.toBeUndefined();
  });

  it("current() is undefined until setCurrent()", () => {
    const a = new KeyringBackedAccountList(new FakeKeyring());
    expect(a.current()).toBeUndefined();
    a.setCurrent(REF);
    expect(a.current()).toBe(REF);
  });

  it("setCurrent() overwrites the previous current", () => {
    const a = new KeyringBackedAccountList(new FakeKeyring());
    const REF2: AccountRef = { ...REF, networkId: "sango-testnet" };
    a.setCurrent(REF);
    a.setCurrent(REF2);
    expect(a.current()).toBe(REF2);
  });
});