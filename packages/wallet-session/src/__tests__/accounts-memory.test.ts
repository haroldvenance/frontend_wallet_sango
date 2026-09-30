import { asAddress } from "@sango/wallet-chains";
import { describe, expect, it } from "vitest";
import { InMemoryAccountList } from "../accounts";
import { fakeEntry } from "./_helpers";
import type { AccountRef } from "@sango/wallet-chains";

const REF: AccountRef = {
  family: "sango",
  accountIndex: 0,
  networkId: "sango-devnet",
};

describe("InMemoryAccountList", () => {
  it("starts empty", async () => {
    const a = new InMemoryAccountList();
    expect(await a.list()).toEqual([]);
    expect(a.current()).toBeUndefined();
  });

  it("persist → list (sorted by createdAt)", async () => {
    const a = new InMemoryAccountList();
    await a.persist(fakeEntry(asAddress("aa".repeat(20)), "Z", 3000));
    await a.persist(fakeEntry(asAddress("bb".repeat(20)), "A", 1000));
    const list = await a.list();
    expect(list.map((s) => s.label)).toEqual(["A", "Z"]);
  });

  it("forget removes", async () => {
    const a = new InMemoryAccountList();
    const id = asAddress("aa".repeat(20));
    await a.persist(fakeEntry(id));
    await a.forget(id);
    expect(await a.list()).toEqual([]);
  });

  it("current / setCurrent", () => {
    const a = new InMemoryAccountList();
    expect(a.current()).toBeUndefined();
    a.setCurrent(REF);
    expect(a.current()).toBe(REF);
  });
});