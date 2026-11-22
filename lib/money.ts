// All money is integer cents. Floating-point dollars never cross a module boundary.

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const MAX_CENTS = 100_000_000; // $1,000,000 per value is far above any single bill line.

export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}

/** Dollars without the currency symbol, for editable inputs: 1234.5 → "1234.50". */
export function centsToInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

/**
 * Parses "$1,234.56", "1234", "-12.00" or accounting "(12.00)" into cents.
 * Returns null for anything else rather than guessing.
 */
export function parseMoney(input: string): number | null {
  let text = input.trim();
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) { negative = true; text = text.slice(1, -1); }
  if (text.startsWith("-")) {
    if (negative) return null;
    negative = true;
    text = text.slice(1);
  }
  text = text.replace(/^\$/, "");
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.replace(/,/g, "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return negative ? -cents : cents;
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
