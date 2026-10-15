import { describe, expect, it } from "vitest";

import { classifyRelativeTime } from "./format-relative-time";

// Fixed reference point for deterministic tests.
const NOW_MS = 1_700_000_000_000; // 2023-11-14T22:13:20Z
const NOW_SEC = Math.floor(NOW_MS / 1000);

function tsAgo(seconds: number): number {
  return NOW_SEC - seconds;
}

describe("classifyRelativeTime", () => {
  it("delta < 30s → now", () => {
    expect(classifyRelativeTime(tsAgo(0), NOW_MS).kind).toBe("now");
    expect(classifyRelativeTime(tsAgo(29), NOW_MS).kind).toBe("now");
  });

  it("30s-59s → seconds", () => {
    const r = classifyRelativeTime(tsAgo(45), NOW_MS);
    expect(r.kind).toBe("seconds");
    if (r.kind === "seconds") expect(r.value).toBe(45);
  });

  it("60s-59min → minutes", () => {
    const r = classifyRelativeTime(tsAgo(60), NOW_MS);
    expect(r.kind).toBe("minutes");
    if (r.kind === "minutes") expect(r.value).toBe(1);

    const r2 = classifyRelativeTime(tsAgo(59 * 60), NOW_MS);
    expect(r2.kind).toBe("minutes");
    if (r2.kind === "minutes") expect(r2.value).toBe(59);
  });

  it("1h-23h → hours", () => {
    const r = classifyRelativeTime(tsAgo(3600), NOW_MS);
    expect(r.kind).toBe("hours");
    if (r.kind === "hours") expect(r.value).toBe(1);

    const r2 = classifyRelativeTime(tsAgo(23 * 3600), NOW_MS);
    expect(r2.kind).toBe("hours");
    if (r2.kind === "hours") expect(r2.value).toBe(23);
  });

  it("1d-6d → days", () => {
    const r = classifyRelativeTime(tsAgo(86400), NOW_MS);
    expect(r.kind).toBe("days");
    if (r.kind === "days") expect(r.value).toBe(1);

    const r6 = classifyRelativeTime(tsAgo(6 * 86400), NOW_MS);
    expect(r6.kind).toBe("days");
    if (r6.kind === "days") expect(r6.value).toBe(6);
  });

  it("≥ 7d → absolute", () => {
    const r = classifyRelativeTime(tsAgo(7 * 86400), NOW_MS);
    expect(r.kind).toBe("absolute");
    if (r.kind === "absolute") expect(r.seconds).toBe(tsAgo(7 * 86400));
  });

  it("timestamp futur (clock skew) → now", () => {
    const future = NOW_SEC + 3600;
    expect(classifyRelativeTime(future, NOW_MS).kind).toBe("now");
  });
});
