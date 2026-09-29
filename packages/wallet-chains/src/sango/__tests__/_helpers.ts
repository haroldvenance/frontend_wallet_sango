import { vi } from "vitest";
import type { SangoRpc } from "../rpc";
import type { Signer } from "../../types/signer";

export function mockRpc(overrides: Partial<SangoRpc> = {}): SangoRpc {
  return {
    getChainId: vi.fn(async () => "0x" + "11".repeat(32)),
    getAccount: vi.fn(async () => null),
    getBaseFee: vi.fn(async () => "0"),
    getTransactionsByAddress: vi.fn(async () => ({
      total: 0,
      offset: 0,
      limit: 20,
      items: [],
    })),
    sendTransaction: vi.fn(async () => "0x" + "00".repeat(32)),
    ...overrides,
  };
}

// ⚠️ Type explicite non-générique : depuis TS 5.7, `new Uint8Array(n)`
//    produit `Uint8Array<ArrayBuffer>` et laisser TS inférer le paramètre
//    rejette les `Uint8Array<ArrayBufferLike>` (issus de `hexToBytes`,
//    `slice()`, etc.). Typer en `Uint8Array` accepte les deux.
export function mockSigner(publicKey: Uint8Array = new Uint8Array(32).fill(0x01)): Signer {
  return {
    getPublicKey: vi.fn(async () => publicKey),
    signDomain: vi.fn(async () => new Uint8Array(64).fill(0xff)),
  };
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
