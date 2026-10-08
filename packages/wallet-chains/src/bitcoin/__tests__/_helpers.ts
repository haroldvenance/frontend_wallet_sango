import { vi } from "vitest";

import type { BitcoinRpc, BitcoinFeeRates, Utxo } from "../rpc";

export const TESTNET_ADDRESS =
  "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl";

export function mockBitcoinRpc(overrides: Partial<BitcoinRpc> = {}): BitcoinRpc {
  return {
    getUtxos: vi.fn(async () => [] as readonly Utxo[]),
    getFeeRates: vi.fn(
      async (): Promise<BitcoinFeeRates> => ({
        fast: 5n,
        normal: 3n,
        slow: 1n,
      }),
    ),
    broadcastTx: vi.fn(async () => "a".repeat(64)),
    // Patch A.2 — requis pour l'interface BitcoinRpc (historique).
    getTxs: vi.fn(async () => []),
    ...overrides,
  };
}

export function utxo(overrides: Partial<Utxo> = {}): Utxo {
  return {
    txid: "a".repeat(64),
    vout: 0,
    value: 100_000n,
    confirmed: true,
    ...overrides,
  };
}
