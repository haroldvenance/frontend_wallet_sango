import type { Hex, Tx } from "./types";

/**
 * Mock d'une transaction pour les tests et le développement local tant
 * que `sango_getTransactionsByAddress` (P3.2.c) n'est pas livré.
 *
 * ⚠️ Ce fichier sera **supprimé** dès que le backend livre la méthode.
 */
export const MOCK_TXS: readonly Tx[] = [
  {
    hash: "0x" + "aa".repeat(32) as Hex,
    kind: "native",
    blockHeight: 42,
    blockHash: "0x" + "bb".repeat(32) as Hex,
    txIndex: 0,
    version: 1,
    chainId: "0x" + "11".repeat(32) as Hex,
    nonce: 0,
    sender: "0x" + "cc".repeat(20) as Hex,
    publicKey: null,
    gasLimit: 21000,
    maxFee: "2000",
    priorityFee: "0",
    value: "1000000000",
    txKind: 0x01,
    recipient: "0x" + "dd".repeat(20) as Hex,
    data: "0x",
    signature: "0x" + "ee".repeat(64) as Hex,
    success: true,
    gasUsed: 21000,
  },
  {
    hash: "0x" + "f1".repeat(32) as Hex,
    kind: "native",
    blockHeight: 40,
    blockHash: "0x" + "f2".repeat(32) as Hex,
    txIndex: 0,
    version: 1,
    chainId: "0x" + "11".repeat(32) as Hex,
    nonce: 1,
    sender: "0x" + "cc".repeat(20) as Hex,
    publicKey: null,
    gasLimit: 21000,
    maxFee: "2000",
    priorityFee: "0",
    value: "500000000",
    txKind: 0x01,
    recipient: "0x" + "f3".repeat(20) as Hex,
    data: "0x",
    signature: "0x" + "f4".repeat(64) as Hex,
    success: true,
    gasUsed: 21000,
  },
];

/**
 * Flag : `VITE_SANGO_TX_MOCK=true` active les mocks pour `getTransactionsByAddress`.
 * Une fois P3.2.c livré, retirer ce flag et le fichier.
 */
export function isTxMockEnabled(): boolean {
  if (typeof import.meta === "undefined") return false;
  return (
    (import.meta as unknown as { env: Record<string, string> }).env
      ?.VITE_SANGO_TX_MOCK === "true"
  );
}
