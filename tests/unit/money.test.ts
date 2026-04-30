import { describe, expect, it } from "vitest";

import {
  addCents,
  centsToDollars,
  dollarsToCents,
  formatMoney,
  multiplyCents,
} from "@/lib/utils/money";

describe("money", () => {
  describe("dollarsToCents", () => {
    it("rounds to nearest cent", () => {
      // 1.005 cannot be represented exactly in IEEE-754 (it's 1.00499...),
      // which is why money belongs in integer cents in the first place.
      // Pick representable inputs for the round assertion.
      expect(dollarsToCents(1.235)).toBe(124);
      expect(dollarsToCents(1.0049)).toBe(100);
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(99.99)).toBe(9999);
    });

    it("throws on non-finite", () => {
      expect(() => dollarsToCents(Number.NaN)).toThrow();
      expect(() => dollarsToCents(Number.POSITIVE_INFINITY)).toThrow();
    });
  });

  describe("centsToDollars", () => {
    it("inverts dollarsToCents for representable amounts", () => {
      for (const d of [0, 1, 99.99, 1234.56, 1_000_000]) {
        expect(centsToDollars(dollarsToCents(d))).toBeCloseTo(d, 2);
      }
    });
  });

  describe("addCents", () => {
    it("truncates floats and sums integer cents", () => {
      expect(addCents(100, 200, 300)).toBe(600);
      expect(addCents(99.9, 0.5)).toBe(99); // truncation, not rounding
    });
    it("returns 0 with no args", () => {
      expect(addCents()).toBe(0);
    });
  });

  describe("multiplyCents", () => {
    it("rounds the product", () => {
      expect(multiplyCents(100, 1.5)).toBe(150);
      expect(multiplyCents(1, 0.005)).toBe(0); // 0.005 rounds to 0
      expect(multiplyCents(1, 0.5)).toBe(1); // banker's rounding edge
    });
  });

  describe("formatMoney", () => {
    it("formats CAD by default", () => {
      const out = formatMoney(12345);
      expect(out).toMatch(/123\.45/);
      expect(out).toMatch(/CA|\$/);
    });
    it("respects USD", () => {
      const out = formatMoney(99, "USD", "en-US");
      expect(out).toBe("$0.99");
    });
  });
});
