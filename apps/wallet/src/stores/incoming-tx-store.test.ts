import { beforeEach, describe, expect, it } from "vitest";

import { useIncomingTxStore } from "./incoming-tx-store";

beforeEach(() => {
  useIncomingTxStore.setState({ seenKeys: {} });
  localStorage.clear();
});

describe("incoming-tx-store", () => {
  it("markSeen ajoute les clés", () => {
    useIncomingTxStore.getState().markSeen("eth", ["0xa", "0xb"]);
    expect(useIncomingTxStore.getState().seenKeys["eth"]).toEqual(["0xa", "0xb"]);
  });

  it("markSeen idempotent sur networkId inconnu", () => {
    useIncomingTxStore.getState().markSeen("eth", []);
    expect(useIncomingTxStore.getState().seenKeys["eth"]).toBeUndefined();
  });

  it("markSeen append au lieu d'overwrite", () => {
    useIncomingTxStore.getState().markSeen("eth", ["0xa"]);
    useIncomingTxStore.getState().markSeen("eth", ["0xb"]);
    expect(useIncomingTxStore.getState().seenKeys["eth"]).toEqual(["0xa", "0xb"]);
  });

  it("markSeen isole par networkId", () => {
    useIncomingTxStore.getState().markSeen("eth", ["0xa"]);
    useIncomingTxStore.getState().markSeen("bsc", ["0xb"]);
    expect(useIncomingTxStore.getState().seenKeys["eth"]).toEqual(["0xa"]);
    expect(useIncomingTxStore.getState().seenKeys["bsc"]).toEqual(["0xb"]);
  });

  it("FIFO max 50 par networkId", () => {
    // 60 valeurs : 0x0 … 0x59 (décimal 0 à 59).
    // FIFO tronqué aux 50 dernières = indices 10 à 59.
    const hashes = Array.from({ length: 60 }, (_, i) => `0x${i.toString(16)}`);
    useIncomingTxStore.getState().markSeen("eth", hashes);
    const seen = useIncomingTxStore.getState().seenKeys["eth"]!;
    expect(seen).toHaveLength(50);
    expect(seen[0]).toBe("0xa");   // 10 → 0xa
    expect(seen[49]).toBe("0x3b"); // 59 → 0x3b
  });
});
