import { env } from "@/lib/env";

/**
 * Money is stored as integer cents. Never use floats.
 * Format / compute through these helpers only.
 */

export type Currency = "CAD" | "USD" | "EUR" | "GBP";

export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    throw new Error("dollarsToCents: not a finite number");
  }
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function addCents(...amounts: number[]): number {
  return amounts.reduce((sum, n) => sum + Math.trunc(n), 0);
}

export function multiplyCents(cents: number, factor: number): number {
  return Math.round(cents * factor);
}

export function formatMoney(
  cents: number,
  currency: Currency = (env.DEFAULT_CURRENCY as Currency) ?? "CAD",
  locale = "en-CA",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToDollars(cents));
}
