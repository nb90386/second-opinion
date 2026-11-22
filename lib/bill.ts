import { z } from "zod";
import { isIsoDate } from "./dates.ts";
import { MAX_CENTS } from "./money.ts";

// The bill is the single data contract shared by fixtures, CSV parsing, the analysis API and browser storage.

export const LIMITS = { lines: 500, description: 160, code: 16, note: 500, text: 120, address: 240 } as const;

const isoDate = z.string().refine(isIsoDate, "Use a real calendar date (YYYY-MM-DD).");
const cents = z.number().int("Amounts must be whole cents.").min(-MAX_CENTS).max(MAX_CENTS);
const text = (max: number) => z.string().max(max).refine(value => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), "Remove control characters.");

export const quantitySchema = z.number().positive("Quantity must be more than zero.").max(9999)
  .refine(value => Math.abs(Math.round(value * 100) - value * 100) < 1e-6, "Use at most two decimal places.");

export const LineItemSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  date: isoDate,
  code: z.string().max(LIMITS.code).regex(/^[A-Za-z0-9.-]*$/, "Codes contain only letters, numbers, dots and dashes."),
  description: text(LIMITS.description).refine(value => value.trim().length > 0, "Add a description."),
  quantity: quantitySchema,
  unitPrice: cents.nullable(),
  amount: cents,
  /** The patient's own mark on this line. */
  mark: z.enum(["none", "not-received", "unsure"]),
  note: text(LIMITS.note),
});

export const BillSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  origin: z.enum(["sample", "upload", "manual"]),
  sampleId: z.string().max(40).nullable(),
  provider: text(LIMITS.text),
  providerAddress: text(LIMITS.address),
  accountNumber: text(40),
  statementDate: isoDate.nullable(),
  careSetting: z.enum(["emergency", "outpatient", "inpatient"]),
  admitDate: isoDate.nullable(),
  dischargeDate: isoDate.nullable(),
  coverage: z.enum(["insured", "self-pay", "unknown"]),
  /** "Total charges" exactly as printed on the bill. */
  statedTotal: cents.nullable(),
  /** "Amount due" / "patient balance" exactly as printed on the bill. */
  amountDue: cents.nullable(),
  /** Patient responsibility from the insurer's Explanation of Benefits, entered by the user. */
  eobResponsibility: cents.nonnegative().nullable(),
  /** Total from a Good Faith Estimate received before care, entered by the user. */
  goodFaithEstimate: cents.nonnegative().nullable(),
  lineItems: z.array(LineItemSchema).max(LIMITS.lines, `A bill can have at most ${LIMITS.lines} lines.`),
}).superRefine((bill, ctx) => {
  if (bill.admitDate && bill.dischargeDate && bill.dischargeDate < bill.admitDate) {
    ctx.addIssue({ code: "custom", path: ["dischargeDate"], message: "Discharge can't be before admission." });
  }
  const ids = new Set<string>();
  bill.lineItems.forEach((line, index) => {
    if (ids.has(line.id)) ctx.addIssue({ code: "custom", path: ["lineItems", index, "id"], message: "Duplicate line id." });
    ids.add(line.id);
  });
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type Bill = z.infer<typeof BillSchema>;
export type CareSetting = Bill["careSetting"];
export type Coverage = Bill["coverage"];

export const CARE_SETTING_LABEL: Record<CareSetting, string> = {
  emergency: "Emergency visit",
  outpatient: "Outpatient care",
  inpatient: "Hospital stay",
};

/** A bill id that always satisfies the schema's 40-character limit. */
export function newBillId(prefix: "upload" | "manual"): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function emptyBill(id: string, origin: Bill["origin"]): Bill {
  return {
    id, origin, sampleId: null, provider: "", providerAddress: "", accountNumber: "", statementDate: null,
    careSetting: "emergency", admitDate: null, dischargeDate: null, coverage: "unknown",
    statedTotal: null, amountDue: null, eobResponsibility: null, goodFaithEstimate: null, lineItems: [],
  };
}

/** Readable zod issues for API responses, bounded so a hostile payload can't produce a huge reply. */
export function describeIssues(error: z.ZodError, limit = 10): { path: string; message: string }[] {
  return error.issues.slice(0, limit).map(issue => ({ path: issue.path.join(".") || "(root)", message: issue.message }));
}
