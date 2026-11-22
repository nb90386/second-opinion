// Calendar dates are ISO strings (YYYY-MM-DD) handled in UTC so time zones never shift a service date.

const DAY_MS = 86_400_000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 1990 && y <= 2100;
}

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

const display = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatDate(iso: string): string {
  return display.format(new Date(toUtc(iso)));
}

export function formatLongDate(iso: string): string {
  return long.format(new Date(toUtc(iso)));
}

/** Accepts YYYY-MM-DD or US M/D/YYYY. Two-digit years are rejected as ambiguous. */
export function parseCalendarDate(input: string): string | null {
  const text = input.trim();
  if (isIsoDate(text)) return text;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!us) return null;
  const iso = `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return isIsoDate(iso) ? iso : null;
}

/** Today's calendar date in the user's local time zone, as ISO. */
export function localToday(now: Date): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
