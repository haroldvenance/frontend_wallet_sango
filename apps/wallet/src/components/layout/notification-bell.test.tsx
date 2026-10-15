import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

// i18n mock stable (évite re-render loop).
const { tStable } = vi.hoisted(() => ({
  tStable: {
    notificationBell: {
      ariaLabel: "Notifications",
      title: "Notifications",
      empty: "Aucune reception",
      markAllRead: "Tout marquer comme lu",
      from: "de",
      viewAll: "Voir tout",
      sources: { evm: "EVM", bitcoin: "Bitcoin", sango: "Sango" },
    },
  },
}));
vi.mock("@/i18n/use-translation", () => ({
  useTranslation: () => tStable,
}));

import {
  useIncomingNotificationStore,
  type IncomingNotification,
} from "@/stores/incoming-notification-store";

import { NotificationBell } from "./notification-bell";

function entry(
  key: string,
  read = false,
  source: "evm" | "bitcoin" | "sango" = "evm",
): IncomingNotification {
  return {
    key,
    source,
    networkId: "ethereum-mainnet",
    txHash: key,
    symbol: "ETH",
    amount: 1.5,
    counterparty: "0x1234567890abcdef",
    status: "confirmed",
    detectedAt: Date.now(),
    read,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useIncomingNotificationStore.setState({ entries: [] });
});

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

describe("NotificationBell", () => {
  it("pas de badge si aucune entrée", () => {
    renderBell();
    expect(screen.queryByTestId("notification-bell-badge")).toBeNull();
  });

  it("badge affiche le compte non-lu", () => {
    useIncomingNotificationStore.setState({
      entries: [entry("a"), entry("b", true), entry("c")],
    });
    renderBell();
    expect(screen.getByTestId("notification-bell-badge").textContent).toBe("2");
  });

  it("badge plafonné à 99+", () => {
    const many = Array.from({ length: 100 }, (_, i) => entry(`k${i}`));
    useIncomingNotificationStore.setState({ entries: many });
    renderBell();
    expect(screen.getByTestId("notification-bell-badge").textContent).toBe("99+");
  });

  it("clic cloche ouvre le dropdown", () => {
    renderBell();
    expect(screen.queryByTestId("notification-bell-dropdown")).toBeNull();
    fireEvent.click(screen.getByTestId("notification-bell"));
    expect(screen.getByTestId("notification-bell-dropdown")).toBeTruthy();
  });

  it("mark all read retire le badge", () => {
    useIncomingNotificationStore.setState({ entries: [entry("a")] });
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell"));
    fireEvent.click(screen.getByTestId("notification-bell-mark-read"));
    expect(screen.queryByTestId("notification-bell-badge")).toBeNull();
  });

  it("view all navigue vers /history et ferme", () => {
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell"));
    fireEvent.click(screen.getByTestId("notification-bell-view-all"));
    expect(mockNavigate).toHaveBeenCalledWith("/history");
    expect(screen.queryByTestId("notification-bell-dropdown")).toBeNull();
  });

  it("dropdown vide affiche le message", () => {
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell"));
    expect(screen.getByText("Aucune reception")).toBeTruthy();
  });

  it("groupe les entrées par famille (EVM + Bitcoin)", () => {
    useIncomingNotificationStore.setState({
      entries: [
        entry("e1", false, "evm"),
        entry("b1", false, "bitcoin"),
        entry("e2", false, "evm"),
      ],
    });
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell"));
    expect(screen.getByTestId("notification-section-evm")).toBeTruthy();
    expect(screen.getByTestId("notification-section-bitcoin")).toBeTruthy();
  });

  it("cache une section vide (Sango sans entrée)", () => {
    useIncomingNotificationStore.setState({
      entries: [entry("e1", false, "evm")],
    });
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell"));
    expect(screen.queryByTestId("notification-section-sango")).toBeNull();
    expect(screen.queryByTestId("notification-section-bitcoin")).toBeNull();
  });
});
