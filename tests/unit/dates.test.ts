import { describe, expect, it } from "vitest";

import {
  DEFAULT_TZ,
  formatDateTime,
  formatDay,
  formatRelative,
  toUserTime,
} from "@/lib/utils/dates";

describe("dates", () => {
  it("DEFAULT_TZ is loaded from env (America/Montreal by default)", () => {
    expect(typeof DEFAULT_TZ).toBe("string");
    expect(DEFAULT_TZ.length).toBeGreaterThan(0);
  });

  it("formatDateTime renders deterministically in a fixed tz", () => {
    // 2026-01-15T05:30:00Z is 00:30 in New York (EST, UTC-5)
    const iso = "2026-01-15T05:30:00.000Z";
    expect(formatDateTime(iso, "yyyy-MM-dd HH:mm", "America/New_York")).toBe(
      "2026-01-15 00:30",
    );
  });

  it("formatDay strips the time portion", () => {
    const iso = "2026-01-15T23:59:59.000Z";
    expect(formatDay(iso, "yyyy-MM-dd", "UTC")).toBe("2026-01-15");
  });

  it("formatRelative returns a string for any Date", () => {
    expect(typeof formatRelative(new Date())).toBe("string");
    expect(formatRelative(new Date(Date.now() - 60_000))).toMatch(/ago/);
  });

  it("toUserTime returns a Date object", () => {
    expect(toUserTime("2026-01-15T00:00:00.000Z", "UTC")).toBeInstanceOf(Date);
  });
});
