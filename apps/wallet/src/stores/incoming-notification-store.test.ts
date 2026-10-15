import { beforeEach, describe, expect, it } from "vitest";

import {
  selectUnreadCount,
  useIncomingNotificationStore,
  type IncomingNotification,
} from "./incoming-notification-store";

function entry(key: string, read = false): IncomingNotification {
  return {
    key,
    networkId: "ethereum-mainnet",
    txHash: key,
    symbol: "ETH",
    amount: 1,
    counterparty: null,
    status: "confirmed",
    detectedAt: Date.now(),
    read,
  };
}

beforeEach(() => {
  useIncomingNotificationStore.setState({ entries: [] });
  localStorage.clear();
});

describe("incoming-notification-store", () => {
  it("add ajoute des entrées", () => {
    useIncomingNotificationStore.getState().add([entry("a"), entry("b")]);
    expect(useIncomingNotificationStore.getState().entries).toHaveLength(2);
  });

  it("add idempotent (dédup par key)", () => {
    useIncomingNotificationStore.getState().add([entry("a")]);
    useIncomingNotificationStore.getState().add([entry("a")]);
    expect(useIncomingNotificationStore.getState().entries).toHaveLength(1);
  });

  it("add append et préserve l'ordre", () => {
    useIncomingNotificationStore.getState().add([entry("a")]);
    useIncomingNotificationStore.getState().add([entry("b")]);
    const entries = useIncomingNotificationStore.getState().entries;
    expect(entries.map((e) => e.key)).toEqual(["a", "b"]);
  });

  it("markAllRead passe tout à true", () => {
    useIncomingNotificationStore.getState().add([entry("a"), entry("b")]);
    useIncomingNotificationStore.getState().markAllRead();
    const entries = useIncomingNotificationStore.getState().entries;
    expect(entries.every((e) => e.read)).toBe(true);
  });

  it("clear vide tout", () => {
    useIncomingNotificationStore.getState().add([entry("a")]);
    useIncomingNotificationStore.getState().clear();
    expect(useIncomingNotificationStore.getState().entries).toEqual([]);
  });

  it("FIFO max 100", () => {
    const many = Array.from({ length: 120 }, (_, i) => entry(`k${i}`));
    useIncomingNotificationStore.getState().add(many);
    const entries = useIncomingNotificationStore.getState().entries;
    expect(entries).toHaveLength(100);
    expect(entries[0]!.key).toBe("k20");
    expect(entries[99]!.key).toBe("k119");
  });

  it("selectUnreadCount compte les non-lus", () => {
    useIncomingNotificationStore
      .getState()
      .add([entry("a"), entry("b", true), entry("c")]);
    const count = selectUnreadCount(useIncomingNotificationStore.getState());
    expect(count).toBe(2);
  });
});
