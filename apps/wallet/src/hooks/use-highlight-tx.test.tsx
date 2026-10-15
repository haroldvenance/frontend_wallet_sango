import { renderHook, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHighlightTx } from "./use-highlight-tx";

beforeEach(() => {
  // jsdom ne fournit pas scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

function wrapper(initialUrl: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  );
}

describe("useHighlightTx", () => {
  it("ne crashe pas sans ?tx", () => {
    renderHook(() => useHighlightTx(), { wrapper: wrapper("/history") });
    // pas d'assertion — on vérifie juste l'absence de throw
  });

  it("applique la classe si l'élément existe déjà", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    el.id = "tx-0xabc";
    document.body.appendChild(el);

    renderHook(() => useHighlightTx(), {
      wrapper: wrapper("/history?tx=0xabc"),
    });

    vi.advanceTimersByTime(100); // 2 polls
    expect(el.classList.contains("highlight-tx")).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalled();
  });

  it("attend que l'élément apparaisse (list async)", () => {
    vi.useFakeTimers();
    renderHook(() => useHighlightTx(), {
      wrapper: wrapper("/history?tx=0xdead"),
    });

    vi.advanceTimersByTime(200); // rien, pas d'élément
    const el = document.createElement("div");
    el.id = "tx-0xdead";
    document.body.appendChild(el);

    vi.advanceTimersByTime(100); // poll suivant → trouve
    expect(el.classList.contains("highlight-tx")).toBe(true);
  });

  it("retire la classe après 2.5s", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    el.id = "tx-0xabc";
    document.body.appendChild(el);

    renderHook(() => useHighlightTx(), {
      wrapper: wrapper("/history?tx=0xabc"),
    });

    vi.advanceTimersByTime(100);
    expect(el.classList.contains("highlight-tx")).toBe(true);

    vi.advanceTimersByTime(2600);
    expect(el.classList.contains("highlight-tx")).toBe(false);
  });

  it("abandonne après 5s si l'élément n'apparaît jamais", () => {
    vi.useFakeTimers();
    renderHook(() => useHighlightTx(), {
      wrapper: wrapper("/history?tx=0xmissing"),
    });

    // Pas de throw, pas de highlight
    vi.advanceTimersByTime(6000);
    expect(document.querySelector(".highlight-tx")).toBeNull();
  });
});
