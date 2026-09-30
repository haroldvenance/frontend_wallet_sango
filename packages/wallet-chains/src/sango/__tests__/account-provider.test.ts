import { asPublicKey } from "../../types/address";
import { asAddress } from "../../types/address";
import { describe, expect, it, vi } from "vitest";
import { SangoAccountProvider } from "../account-provider";
import { mockRpc } from "./_helpers";

const ADDR = asAddress("aa".repeat(20));
const PK = asPublicKey("cc".repeat(32));

describe("SangoAccountProvider", () => {
  it("returns AccountState with hex publicKey when registered", async () => {
    const rpc = mockRpc({
      getAccount: vi.fn(async () => ({
        address: ADDR,
        publicKey: PK,
        balance: "12345000000",
        nonce: 42,
      })),
    });
    const p = new SangoAccountProvider(rpc);
    const acc = await p.getAccount(ADDR);

    expect(acc).not.toBeNull();
    expect(acc!.address).toBe(ADDR);
    expect(acc!.publicKey).toBe(PK);
    expect(acc!.balance).toBe(12_345_000_000n);
    expect(acc!.nonce).toBe(42);
  });

  it("returns AccountState with publicKey=null for ghost accounts", async () => {
    const rpc = mockRpc({
      getAccount: vi.fn(async () => ({
        address: ADDR,
        publicKey: null,
        balance: "0",
        nonce: 0,
      })),
    });
    const p = new SangoAccountProvider(rpc);
    const acc = await p.getAccount(ADDR);
    expect(acc).not.toBeNull();
    expect(acc!.publicKey).toBeNull();
    expect(acc!.balance).toBe(0n);
  });

  it("returns null when the RPC returns null", async () => {
    const p = new SangoAccountProvider(mockRpc());
    expect(await p.getAccount(ADDR)).toBeNull();
  });

  it("converts the decimal string balance to bigint", async () => {
    const rpc = mockRpc({
      getAccount: vi.fn(async () => ({
        address: ADDR,
        publicKey: null,
        balance: "999999999999999999999",
        nonce: 0,
      })),
    });
    const p = new SangoAccountProvider(rpc);
    const acc = await p.getAccount(ADDR);
    expect(acc!.balance).toBe(999_999_999_999_999_999_999n);
  });

  it("forwards the address to the RPC verbatim", async () => {
    const get = vi.fn(async () => null);
    const p = new SangoAccountProvider(mockRpc({ getAccount: get }));
    await p.getAccount(ADDR);
    expect(get).toHaveBeenCalledWith(ADDR);
  });
});
