import { format as formatDate, formatDistanceToNow } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

import { env } from "@/lib/env";

/**
 * Always render dates in the user's timezone. Default is America/Montreal.
 * Never call Date.toLocaleString directly in components.
 */

export const DEFAULT_TZ = env.DEFAULT_TIMEZONE;

export function formatDateTime(
  date: Date | string,
  pattern = "yyyy-MM-dd HH:mm",
  tz: string = DEFAULT_TZ,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, tz, pattern);
}

export function formatDay(
  date: Date | string,
  pattern = "yyyy-MM-dd",
  tz: string = DEFAULT_TZ,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, tz, pattern);
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function toUserTime(date: Date | string, tz: string = DEFAULT_TZ): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(d, tz);
}

export { formatDate };
